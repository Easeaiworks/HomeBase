import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Tool definitions for Claude — 11 tools total
const TOOLS = [
  {
    name: "create_event",
    description:
      "Create a calendar event or reminder for the household. Use when the user wants to schedule something, set a reminder, or add an appointment.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        starts_at: { type: "string", description: "ISO 8601 datetime for when the event starts" },
        ends_at: { type: "string", description: "ISO 8601 datetime for when the event ends (optional)" },
        description: { type: "string", description: "Event description" },
        location: { type: "string", description: "Event location" },
      },
      required: ["title", "starts_at"],
    },
  },
  {
    name: "draft_message",
    description:
      "Draft an SMS or email message for the user to approve before sending.",
    input_schema: {
      type: "object",
      properties: {
        contact_name: { type: "string", description: "Name of the contact to message" },
        type: { type: "string", enum: ["sms", "email"], description: "Message type" },
        suggested_content: { type: "string", description: "The suggested message content" },
        context: { type: "string", description: "Why this message is being sent" },
      },
      required: ["contact_name", "type", "suggested_content"],
    },
  },
  {
    name: "add_grocery_item",
    description:
      "Add an item to the household grocery list.",
    input_schema: {
      type: "object",
      properties: {
        item_name: { type: "string", description: "Name of the grocery item" },
        quantity: { type: "string", description: "Quantity (e.g., '2 lbs', '1 gallon')" },
        category: { type: "string", description: "Grocery category (Produce, Dairy, Meat, Bakery, Frozen, Pantry, Beverages, Other)" },
      },
      required: ["item_name"],
    },
  },
  {
    name: "log_expense",
    description:
      "Log an expense for the household. Use when the user mentions spending money, buying something, or paying a bill. Also used after scanning receipts.",
    input_schema: {
      type: "object",
      properties: {
        vendor: { type: "string", description: "Store or vendor name" },
        amount: { type: "number", description: "Amount spent" },
        category: { type: "string", description: "Expense category (House, Entertainment, Kids, Groceries, Vehicle, Health, Subscriptions)" },
        subcategory: { type: "string", description: "Subcategory if applicable" },
        date: { type: "string", description: "Date of expense (YYYY-MM-DD), defaults to today" },
        notes: { type: "string", description: "Additional notes" },
      },
      required: ["amount", "category"],
    },
  },
  {
    name: "store_receipt",
    description:
      "Store a scanned receipt with extracted data. Use AFTER scanning a receipt image — stores the image in cloud storage and saves all extracted line items, vendor, total for future recall. Always use this after successfully reading a receipt.",
    input_schema: {
      type: "object",
      properties: {
        vendor_name: { type: "string", description: "Vendor/store name from the receipt" },
        total_amount: { type: "number", description: "Total amount on the receipt" },
        tax_amount: { type: "number", description: "Tax amount if visible" },
        receipt_date: { type: "string", description: "Date on the receipt (YYYY-MM-DD)" },
        payment_method: { type: "string", description: "Payment method (cash, visa, mastercard, debit, etc.)" },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              qty: { type: "number" },
              unit_price: { type: "number" },
              total: { type: "number" }
            }
          },
          description: "Individual items on the receipt"
        },
        raw_text: { type: "string", description: "Full raw text extracted from the receipt" },
        category: { type: "string", description: "Expense category" },
        expense_id: { type: "string", description: "ID of the expense that was logged for this receipt (from log_expense)" },
      },
      required: ["vendor_name", "total_amount"],
    },
  },
  {
    name: "search_receipts",
    description:
      "Search stored receipts by vendor, amount, date range, or keywords. Use when the user asks about a past purchase, wants to see what they bought somewhere, or asks 'what was that charge at...' or 'show me receipts from...' or 'what did I spend at...'. Also use when reviewing budget vs actual to pull up specific charges.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text search (vendor name, item, etc.)" },
        vendor: { type: "string", description: "Filter by vendor/store name" },
        min_amount: { type: "number", description: "Minimum amount" },
        max_amount: { type: "number", description: "Maximum amount" },
        start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
    },
  },
  {
    name: "search_recipes",
    description:
      "Search for recipe suggestions.",
    input_schema: {
      type: "object",
      properties: {
        ingredients: { type: "array", items: { type: "string" }, description: "Ingredients available" },
        cuisine: { type: "string", description: "Preferred cuisine type" },
        max_time_min: { type: "number", description: "Maximum cooking time in minutes" },
        servings: { type: "number", description: "Number of servings needed" },
        dietary: { type: "string", description: "Dietary restrictions" },
      },
    },
  },
  {
    name: "add_maintenance_item",
    description:
      "Add a home, vehicle, pet, or appliance maintenance reminder.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["home", "vehicle", "pet", "appliance"] },
        title: { type: "string", description: "What needs to be done" },
        description: { type: "string", description: "Details" },
        asset_name: { type: "string", description: "Which asset" },
        frequency_days: { type: "number", description: "How often this recurs (in days)" },
        next_due_at: { type: "string", description: "When this is next due (ISO 8601)" },
      },
      required: ["category", "title"],
    },
  },
  {
    name: "find_local_service",
    description:
      "Search for local service providers with tips for hiring.",
    input_schema: {
      type: "object",
      properties: {
        service_type: { type: "string", description: "Type of service needed" },
        specific_need: { type: "string", description: "Specific problem" },
      },
      required: ["service_type"],
    },
  },
  {
    name: "check_schedule_conflicts",
    description:
      "Check for scheduling conflicts on a given date/time.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date to check (YYYY-MM-DD)" },
        time: { type: "string", description: "Time to check (HH:MM)" },
        duration_min: { type: "number", description: "Duration in minutes" },
      },
      required: ["date"],
    },
  },
  {
    name: "get_budget_status",
    description:
      "Get current spending vs budget for a category or overall. Use when the user asks about spending, budgets, or financial status.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category to check (or 'all' for overall)" },
        period: { type: "string", enum: ["weekly", "monthly", "annual"], description: "Budget period" },
      },
    },
  },
];

// System prompt
function buildSystemPrompt(householdContext: any) {
  return `You are HomeBase, a friendly and helpful AI family assistant. You help manage a household's schedule, expenses, groceries, meals, home maintenance, and more.

PERSONALITY:
- Warm, conversational, and lighthearted — like a trusted friend who's really organized
- Confirm what you understand before taking action
- Be proactive with helpful suggestions (but not pushy)

HOUSEHOLD CONTEXT:
- Household: ${householdContext.household_name || "Family"}
- Member: ${householdContext.member_name || "User"} (${householdContext.member_role || "parent"})
- Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
- Timezone: ${householdContext.timezone || "America/Toronto"}

RECEIPT SCANNING RULES:
- When you receive a receipt image, extract ALL line items, vendor name, total, tax, date, and payment method
- ALWAYS use store_receipt after extracting receipt data to save it for future recall
- ALWAYS use log_expense to log the total as an expense
- If the user asks about a past receipt or charge, use search_receipts to find it
- When comparing budget vs actual, you can pull up specific receipts to show what charges made up the spending

EXPENSE RULES:
- Default currency is CAD
- When logging expenses, try to match to existing categories
- When budget thresholds are approaching, mention it casually

COMMUNICATION RULES:
- When drafting messages, ask for approval before "sending"
- Show the drafted message content

RECIPE RULES:
- When suggesting recipes, consider family-friendly options
- If the user asks "what should I cook?", ask what ingredients they have

Always respond in a natural, conversational way. Use the tools available to take real actions.`;
}

// Execute tool calls against Supabase
async function executeTool(
  toolName: string,
  input: any,
  supabase: any,
  householdId: string,
  memberId: string,
  userId: string,
  requestImageBase64?: string
) {
  switch (toolName) {
    case "create_event": {
      const { data, error } = await supabase.from("events").insert({
        household_id: householdId,
        created_by: memberId,
        title: input.title,
        starts_at: input.starts_at,
        ends_at: input.ends_at || null,
        description: input.description || null,
        location: input.location || null,
      }).select().single();
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Event "${input.title}" created for ${new Date(input.starts_at).toLocaleString()}`, event_id: data.id };
    }

    case "add_grocery_item": {
      const { data: lists } = await supabase
        .from("grocery_lists").select("id")
        .eq("household_id", householdId).eq("is_active", true)
        .limit(1).single();
      if (!lists) return { success: false, error: "No active grocery list found" };
      const { data, error } = await supabase.from("grocery_items").insert({
        list_id: lists.id, name: input.item_name,
        quantity: input.quantity || null, category: input.category || null,
        added_by: memberId,
      }).select().single();
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Added "${input.item_name}" to your grocery list`, item_id: data.id };
    }

    case "log_expense": {
      const { data: categories } = await supabase
        .from("expense_categories").select("id, name")
        .eq("household_id", householdId)
        .ilike("name", `%${input.category}%`).limit(1);
      const categoryId = categories?.[0]?.id || null;
      const { data, error } = await supabase.from("expenses").insert({
        household_id: householdId, recorded_by: memberId,
        vendor: input.vendor || null, amount: input.amount,
        category_id: categoryId,
        date: input.date || new Date().toISOString().split("T")[0],
        notes: input.notes || null, source: "voice",
      }).select().single();
      if (error) return { success: false, error: error.message };

      // Check budget
      let budgetWarning = null;
      if (categoryId) {
        const { data: budget } = await supabase
          .from("budgets").select("amount, period, alert_threshold")
          .eq("household_id", householdId).eq("category_id", categoryId)
          .eq("is_active", true).limit(1).single();
        if (budget) {
          const startOfMonth = new Date(); startOfMonth.setDate(1);
          const { data: spent } = await supabase
            .from("expenses").select("amount")
            .eq("household_id", householdId).eq("category_id", categoryId)
            .gte("date", startOfMonth.toISOString().split("T")[0]);
          const totalSpent = (spent || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
          const pct = totalSpent / Number(budget.amount);
          if (pct >= budget.alert_threshold) {
            budgetWarning = `Heads up — you've spent $${totalSpent.toFixed(2)} of your $${budget.amount} ${input.category} budget this month (${(pct * 100).toFixed(0)}%).`;
          }
        }
      }
      return { success: true, message: `Logged $${input.amount.toFixed(2)} expense${input.vendor ? ` at ${input.vendor}` : ""}`, budget_warning: budgetWarning, expense_id: data.id };
    }

    case "store_receipt": {
      // Store the receipt image in Supabase Storage if we have one
      let storagePath = '';
      if (requestImageBase64) {
        const fileName = `${householdId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const imageBytes = Uint8Array.from(atob(requestImageBase64), c => c.charCodeAt(0));
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, imageBytes, {
            contentType: 'image/jpeg',
            upsert: false,
          });
        if (uploadError) {
          console.error('Receipt upload error:', uploadError);
          storagePath = `upload_failed_${Date.now()}`;
        } else {
          storagePath = fileName;
        }
      } else {
        storagePath = `no_image_${Date.now()}`;
      }

      // Find category ID
      let categoryId = null;
      if (input.category) {
        const { data: cats } = await supabase
          .from("expense_categories").select("id")
          .eq("household_id", householdId)
          .ilike("name", `%${input.category}%`).limit(1);
        categoryId = cats?.[0]?.id || null;
      }

      const { data, error } = await supabase.from('receipts').insert({
        household_id: householdId,
        uploaded_by: userId,
        expense_id: input.expense_id || null,
        storage_path: storagePath,
        vendor_name: input.vendor_name,
        total_amount: input.total_amount,
        tax_amount: input.tax_amount || null,
        receipt_date: input.receipt_date || new Date().toISOString().split('T')[0],
        payment_method: input.payment_method || null,
        line_items: input.line_items || [],
        raw_text: input.raw_text || null,
        category_id: categoryId,
        currency: 'CAD',
      }).select().single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        message: `Receipt from ${input.vendor_name} ($${input.total_amount.toFixed(2)}) stored. You can recall it anytime by asking about it.`,
        receipt_id: data.id,
        storage_path: storagePath,
        items_count: (input.line_items || []).length,
      };
    }

    case "search_receipts": {
      const { data, error } = await supabase.rpc('search_receipts', {
        p_household_id: householdId,
        p_query: input.query || null,
        p_vendor: input.vendor || null,
        p_min_amount: input.min_amount || null,
        p_max_amount: input.max_amount || null,
        p_start_date: input.start_date || null,
        p_end_date: input.end_date || null,
        p_limit: 20,
      });

      if (error) return { success: false, error: error.message };

      // Generate signed URLs for receipt images so user can view them
      const receiptsWithUrls = await Promise.all((data || []).map(async (r: any) => {
        let image_url = null;
        if (r.storage_path && !r.storage_path.startsWith('no_image') && !r.storage_path.startsWith('upload_failed')) {
          const { data: signedUrl } = await supabase.storage
            .from('receipts')
            .createSignedUrl(r.storage_path, 3600); // 1 hour expiry
          image_url = signedUrl?.signedUrl || null;
        }
        return { ...r, image_url };
      }));

      return {
        success: true,
        receipts: receiptsWithUrls,
        count: receiptsWithUrls.length,
        message: receiptsWithUrls.length > 0
          ? `Found ${receiptsWithUrls.length} receipt(s) matching your search.`
          : 'No receipts found matching that search.',
      };
    }

    case "draft_message": {
      const { data: contact } = await supabase
        .from("contacts").select("id, name, phone, email")
        .eq("household_id", householdId)
        .ilike("name", `%${input.contact_name}%`).limit(1).single();
      const { data: log } = await supabase.from("communication_log").insert({
        household_id: householdId, contact_id: contact?.id || null,
        sent_by: memberId, type: input.type,
        content: input.suggested_content, context: input.context || null,
        status: "drafted",
      }).select().single();
      return {
        success: true, message: `Message drafted for ${input.contact_name}`,
        contact_found: !!contact, draft_id: log?.id,
        draft_content: input.suggested_content, requires_approval: true,
      };
    }

    case "check_schedule_conflicts": {
      const dateStr = input.date;
      const { data: events } = await supabase
        .from("events").select("title, starts_at, ends_at, location")
        .eq("household_id", householdId)
        .gte("starts_at", `${dateStr}T00:00:00`)
        .lte("starts_at", `${dateStr}T23:59:59`)
        .order("starts_at");
      return { success: true, date: dateStr, events: events || [], has_conflicts: (events || []).length > 0 };
    }

    case "get_budget_status": {
      const startOfMonth = new Date(); startOfMonth.setDate(1);
      const { data: expenses } = await supabase
        .from("expenses").select("amount, category_id, expense_categories(name)")
        .eq("household_id", householdId)
        .gte("date", startOfMonth.toISOString().split("T")[0]);
      const { data: budgets } = await supabase
        .from("budgets").select("amount, period, category_id, expense_categories(name)")
        .eq("household_id", householdId).eq("is_active", true);
      const totalSpent = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      // Also get receipt count for context
      const { count: receiptCount } = await supabase
        .from('receipts').select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .gte('receipt_date', startOfMonth.toISOString().split('T')[0]);

      return {
        success: true, total_spent_this_month: totalSpent,
        expenses_count: (expenses || []).length,
        receipts_stored: receiptCount || 0,
        budgets: (budgets || []).map((b: any) => ({
          category: b.expense_categories?.name || "Unknown",
          budget: Number(b.amount), period: b.period,
        })),
        note: receiptCount > 0 ? `You have ${receiptCount} receipts stored this month. Ask me to pull up any specific charge for details.` : undefined,
      };
    }

    case "search_recipes": {
      const { data: recipes } = await supabase
        .from("recipes").select("title, description, ingredients, prep_time_min, cook_time_min, servings, tags, source_url")
        .or(`household_id.eq.${householdId},household_id.is.null`).limit(10);
      return { success: true, recipes: recipes || [], ingredients_provided: input.ingredients || [] };
    }

    case "add_maintenance_item": {
      const { data, error } = await supabase.from("maintenance_items").insert({
        household_id: householdId, category: input.category,
        title: input.title, description: input.description || null,
        asset_name: input.asset_name || null,
        frequency_days: input.frequency_days || null,
        next_due_at: input.next_due_at || null,
      }).select().single();
      if (error) return { success: false, error: error.message };
      const { data: pending } = await supabase
        .from("maintenance_items").select("title, category")
        .eq("household_id", householdId).eq("category", input.category)
        .not("id", "eq", data.id).limit(5);
      return { success: true, message: `Added "${input.title}" to your ${input.category} maintenance list`, item_id: data.id, other_pending: pending || [] };
    }

    case "find_local_service": {
      const tips: Record<string, string[]> = {
        plumber: ["Ask for references from recent jobs", "Make sure the main water shut-off is accessible", "Consider bundling other plumbing jobs", "Get 2-3 quotes", "Ask if they're licensed and insured"],
        electrician: ["Ask for their license number", "Get a written estimate before work begins", "Know where your electrical panel is", "Ask about warranties"],
        general: ["Always ask for references", "Get written estimates from 2-3 providers", "Verify they're licensed and insured", "Ask about warranties and guarantees"],
      };
      return {
        success: true, service_type: input.service_type,
        tips: tips[input.service_type.toLowerCase()] || tips.general,
        note: `To find top-rated ${input.service_type} providers near you, search Google Maps. Here are tips to help you hire well.`,
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const { data: member } = await supabase
      .from("household_members")
      .select("id, household_id, display_name, role, households(name, settings)")
      .eq("user_id", user.id).single();

    if (!member) {
      return new Response(JSON.stringify({ error: "No household found" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const householdId = member.household_id;
    const memberId = member.id;
    const householdContext = {
      household_name: (member as any).households?.name,
      member_name: member.display_name,
      member_role: member.role,
      timezone: ((member as any).households?.settings as any)?.timezone || "America/Toronto",
    };

    const { message, conversation_history = [], image_base64 } = await req.json();

    const messages: any[] = [...conversation_history];

    if (image_base64) {
      messages.push({
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image_base64 } },
          { type: "text", text: message || "Please scan this receipt and extract the vendor, items, amounts, and total. Then log it as an expense and store the receipt for future reference." },
        ],
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    let response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2024-01-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: buildSystemPrompt(householdContext),
        tools: TOOLS,
        messages,
      }),
    });

    let result = await response.json();

    const toolResults: any[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (result.stop_reason === "tool_use" && iterations < MAX_ITERATIONS) {
      iterations++;
      messages.push({ role: "assistant", content: result.content });

      const toolUseBlocks = result.content.filter((block: any) => block.type === "tool_use");
      const toolResultContents: any[] = [];

      for (const toolUse of toolUseBlocks) {
        const toolResult = await executeTool(
          toolUse.name, toolUse.input, supabase,
          householdId, memberId, user.id,
          image_base64 // Pass image for receipt storage
        );
        toolResults.push({ tool: toolUse.name, input: toolUse.input, result: toolResult });
        toolResultContents.push({
          type: "tool_result", tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult),
        });
      }

      messages.push({ role: "user", content: toolResultContents });

      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2024-01-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: buildSystemPrompt(householdContext),
          tools: TOOLS,
          messages,
        }),
      });
      result = await response.json();
    }

    const textBlocks = (result.content || []).filter((block: any) => block.type === "text");
    const responseText = textBlocks.map((b: any) => b.text).join("\n");

    await supabase.from("audit_log").insert({
      household_id: householdId, actor_id: memberId,
      action: "ai_assistant_interaction", entity_type: "conversation",
      metadata: {
        user_message: typeof message === "string" ? message.substring(0, 200) : "image",
        tools_used: toolResults.map((t) => t.tool),
        had_image: !!image_base64,
      },
    });

    return new Response(
      JSON.stringify({
        response: responseText,
        tool_results: toolResults,
        actions_taken: toolResults.map((t) => ({ action: t.tool, result: t.result })),
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
