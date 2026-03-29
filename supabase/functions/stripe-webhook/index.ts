/**
 * Stripe Webhook Edge Function
 * Handles Stripe events: subscription created, updated, canceled, payment failed.
 * Auto-activates household subscription when payment succeeds.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
      },
    });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const householdId = session.metadata?.household_id;
        const plan = session.metadata?.plan;

        if (householdId && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          // Look up the plan tier ID
          const { data: tier } = await supabase
            .from('subscription_tiers')
            .select('id')
            .eq('name', plan || 'family')
            .single();

          // Activate subscription
          await supabase
            .from('households')
            .update({
              subscription_status: 'active',
              stripe_subscription_id: subscription.id,
              subscription_tier_id: tier?.id || null,
              subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', householdId);

          console.log(`Household ${householdId} activated with ${plan} plan`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const householdId = subscription.metadata?.household_id;

        if (householdId) {
          const status = subscription.status === 'active' ? 'active'
            : subscription.status === 'past_due' ? 'past_due'
            : subscription.status === 'canceled' ? 'canceled'
            : 'active';

          await supabase
            .from('households')
            .update({
              subscription_status: status,
              subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', householdId);

          console.log(`Household ${householdId} subscription updated to ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const householdId = subscription.metadata?.household_id;

        if (householdId) {
          await supabase
            .from('households')
            .update({
              subscription_status: 'expired',
              stripe_subscription_id: null,
            })
            .eq('id', householdId);

          console.log(`Household ${householdId} subscription expired`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Find household by stripe subscription ID
          const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (household) {
            await supabase
              .from('households')
              .update({ subscription_status: 'past_due' })
              .eq('id', household.id);

            console.log(`Household ${household.id} payment failed — set to past_due`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
