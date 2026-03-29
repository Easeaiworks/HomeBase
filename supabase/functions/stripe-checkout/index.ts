/**
 * Stripe Checkout Edge Function
 * Creates a Stripe Checkout session for subscription payments.
 * Called from the subscription screen when user picks a plan.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Price IDs — you'll set these in Stripe Dashboard and store as secrets
// For now we'll create prices dynamically if no price IDs are set
const PLAN_PRICES: Record<string, Record<string, string>> = {
  family: {
    monthly: Deno.env.get('STRIPE_PRICE_FAMILY_MONTHLY') || '',
    annual: Deno.env.get('STRIPE_PRICE_FAMILY_ANNUAL') || '',
  },
  premium: {
    monthly: Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY') || '',
    annual: Deno.env.get('STRIPE_PRICE_PREMIUM_ANNUAL') || '',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe is not configured yet. Please set the STRIPE_SECRET_KEY secret.');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Auth check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan, billing_cycle, household_id } = await req.json();

    if (!plan || !billing_cycle || !household_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: plan, billing_cycle, household_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is master account for this household
    const { data: member } = await supabase
      .from('household_members')
      .select('is_master_account')
      .eq('user_id', user.id)
      .eq('household_id', household_id)
      .single();

    if (!member?.is_master_account) {
      return new Response(JSON.stringify({ error: 'Only the household creator can manage subscriptions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer
    const { data: household } = await supabase
      .from('households')
      .select('stripe_customer_id, name')
      .eq('id', household_id)
      .single();

    let customerId = household?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: household?.name || 'HomeBase Household',
        metadata: {
          household_id,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('households')
        .update({ stripe_customer_id: customerId })
        .eq('id', household_id);
    }

    // Get the price ID for the selected plan
    const priceId = PLAN_PRICES[plan]?.[billing_cycle];

    if (!priceId) {
      return new Response(JSON.stringify({
        error: `Stripe prices not configured for ${plan}/${billing_cycle}. Set STRIPE_PRICE_${plan.toUpperCase()}_${billing_cycle.toUpperCase()} secret.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine success/cancel URLs
    const origin = req.headers.get('origin') || 'https://home-base-git-main-ease-ai-works.vercel.app';
    const successUrl = `${origin}/?subscription=success`;
    const cancelUrl = `${origin}/subscription?canceled=true`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          household_id,
          plan,
        },
        trial_period_days: 0, // Trial already handled in-app
      },
      metadata: {
        household_id,
        plan,
      },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
