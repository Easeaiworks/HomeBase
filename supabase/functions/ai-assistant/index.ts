import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Tool definitions for Claude
const TOOLS = [
  {
    name: "create_event",
    description:
      "Create a calendar event or reminder for the household. Use when the user wants to schedule something, set a reminder, or add an appointment.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        starts_at: {
          type: "string",
          description: "ISO 8601 datetime for when the event starts",
        },
        ends_at: {
          type: "string",
          description: "ISO 8601 datetime for when the event ends (optional)",
        },
        description: { type: "string", description: "Event description" },
        location: { type: "string", description: "Event location" },
      },
      required: ["title", "starts_at"],
    },
  },
  {
    name: "draft_message",
    description:
      "Draft an SMS or email message for the user to approve before sending. Use when the user wants to text or email someone, or when they mention being late/needing to notify someone.",
    input_schema: {
      type: "object",
      properties: {
        contact_name: {
          type: "string",
          description: "Name of the contact to message",
        },
        type: {
          type: "string",
          enum: ["sms", "email"],
          description: "Message type",
        },
        suggested_content: {
          type: "string",
          description: "The suggested message content",
        },
        context: {
          type: "string",
          description:
            "Why this message is being sent (e.g., late_pickup, appointment_change)",
        },
      },
      required: ["contact_name", "type", "suggested_content"],
    },
  },
  {
    name: "add_grocery_item",
    description:
      "Add an item to the household grocery list. Use when the user mentions needing to buy something or adds to their list.",
    input_schema: {
      type: "object",
      properties: {
        item_name: { type: "string", description: "Name of the grocery item" },
        quantity: { type: "string", description: "Quantity (e.g., '2 lbs', '1 gallon')" },
        category: {
          type: "string",
          description: "Grocery category (Produce, Dairy, Meat, Bakery, Frozen, Pantry, Beverages, Other)",
        },
      },
      required: ["item_name"],
    },
  },
  {
    name: "log_expense",
    description:
      "Log an expense for the household. Use when the user mentions spending money, buying something, or paying a bill.",
    input_schema: {
      type: "object",
      properties: {
        vendor: { type: "string", description: "Store or vendor name" },
        amount: { type: "number", description: "Amount spent" },
        category: {
          type: "string",
          description:
            "Expense category (House, Entertainment, Kids, Groceries, Vehicle, Health, Subscriptions)",
        },
        subcategory: {
          type: "string",
          description: "Subcategory if applicable",
        },
        date: {
          type: "string",
          description: "Date of expense (YYYY-MM-DD), defaults to today",
        },
        notes: { type: "string", description: "Additional notes" },
      },
      required: ["amount", "category"],
    },
  },
  {
    name: "search_recipes",
    description:
      "Search for recipe suggestions. Use when the user asks what to cook, wants recipe ideas, or mentions ingredients they have.",
    input_schema: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "Ingredients the user has available",
        },
        cuisine: { type: "string", description: "Preferred cuisine type" },
        max_time_min: {
          type: "number",
          description: "Maximum cooking time in minutes",
        },
        servings: { type: "number", description: "Number of servings needed" },
        dietary: {
          type: "string",
          description: "Dietary restrictions (vegetarian, gluten-free, etc.)",
        },
      },
    },
  },
  {
    name: "add_maintenance_item",
    description:
      "Add a home, vehicle, pet, or appliance maintenance reminder. Use when the user mentions something that needs fixing, servicing, or regular maintenance.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["home", "vehicle", "pet", "appliance"],
        },
        title: { type: "string", description: "What needs to be done" },
        description: { type: "string", description: "Details" },
        asset_name: {
          type: "string",
          description: "Which asset (e.g., '2019 Honda Civic', 'Buddy the dog')",
        },
        frequency_days: {
          type: "number",
          description: "How often this recurs (in days)",
        },
        next_due_at: {
          type: "string",
          description: "When this is next due (ISO 8601)",
        },
      },
      required: ["category", "title"],
    },
  },
  {
    name: "find_local_service",
    description:
      "Search for local service providers (plumber, electrician, tutor, etc.) with good reviews. Also provides smart tips for hiring.",
    input_schema: {
      type: "object",
      properties: {
        service_type: {
          type: "string",
          description: "Type of service needed (e.g., plumber, electrician)",
        },
        specific_need: {
          type: "string",
          description: "Specific problem (e.g., 'fix a leaky drain')",
        },
      },
      required: ["service_type"],
    },
  },
  {
    name: "check_schedule_conflicts",
    description:
      "Check for scheduling conflicts on a given date/time and suggest alternatives if there are conflicts.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date to check (YYYY-MM-DD)" },
        time: { type: "string", description: "Time to check (HH:MM)" },
        duration_min: {
          type: "number",
          description: "Duration in minutes",
        },
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
        category: {
          type: "string",
          description: "Category to check (or 'all' for overall)",
        },
        period: {
          type: "string",
          enum: ["weekly", "monthly", "annual"],
          description: "Budget period to check",
        },
      },
    },
  },
];

// System prompt that makes Claude act as HomeBase assistant
function buildSystemPrompt(householdContext: any) {
  return `You are HomeBase, a friendly and helpful AI family assistant. You help manage a household's schedule, expenses, groceries, meals, home maintenance, and more.

PERSONALITY:
- Warm, conversational, and lighthearted — like a trusted friend who's really organized
- Confirm what you understand before taking action
- When there are schedule conflicts, present options and let the user choose
- Always ask for approval before sending messages to contacts
- Be proactive with helpful suggestions (but not pushy)
- When the user mentions hiring a service, also share smart tips (ask for references, prep the area, etc.)
- If the user mentions a plumber/electrician/etc., check if they have pending maintenance items that could be bundled

HOUSEHOLD CONTEXT:
- Household: ${householdContext.household_name || "Family"}
- Member: ${householdContext.member_name || "User"} (${householdContext.member_role || "parent"})
- Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
- Timezone: ${householdContext.timezone || "America/Toronto"}

COMMUNICATION RULES:
- When drafting messages, always ask: "Would you like to dictate your own message, or should I draft one for the situation?"
- Always show the drafted message and ask for approval before "sending"
- If voice/messaging can't complete an action, tell the user you'll pull up the contact so they can finish manually

EXPENSE RULES:
- Default currency is CAD
- When logging expenses, try to match to existing categories
- If a vendor or category is new, create it
- When budget thresholds are approaching, mention it casually

RECIPE RULES:
- When suggesting recipes, consider family-friendly options
- If the user asks "what should I cook?", ask what ingredients they have
- Suggest recipes with links to reputable sources when possible

Always respond in a natural, conversational way. Use the tools available to take real actions.`;
}

// Execute tool calls against Supabase
async function executeTool(
  toolName: string,
  input: any,
  supabase: any,
  householdId: string,
  memberId: string
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
      return {
        success: true,
        message: `Event "${input.title}" created for ${new Date(input.starts_at).toLocaleString()}`,
        event_id: data.id,
      };
    }

    case "add_grocery_item": {
      // Get active grocery list
      const { data: lists } = await supabase
        .from("grocery_lists")
        .select("id")
        .eq("household_id", householdId)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!lists) return { success: false, error: "No active grocery list found" };

      const { data, error } = await supabase.from("grocery_items").insert({
        list_id: lists.id,
        name: input.item_name,
        quantity: input.quantity || null,
        category: input.category || null,
        added_by: memberId,
      }).select().single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        message: `Added "${input.item_name}" to your grocery list`,
        item_id: data.id,
      };
    }

    case "log_expense": {
      // Find or note the category
      const { data: categories } = await supabase
        .from("expense_categories")
        .select("id, name")
        .eq("household_id", householdId)
        .ilike("name", `%${input.category}%`)
        .limit(1);

      const categoryId = categories?.[0]?.id || null;

      const { data, error } = await supabase.from("expenses").insert({
        household_id: householdId,
        recorded_by: memberId,
        vendor: input.vendor || null,
        amount: input.amount,
        category_id: categoryId,
        date: input.date || new Date().toISOString().split("T")[0],
        notes: input.notes || null,
        source: "voice",
      }).select().single();

      if (error) return { success: false, error: error.message };

      // Check budget
      let budgetWarning = null;
      if (categoryId) {
        const { data: budget } = await supabase
          .from("budgets")
          .select("amount, period, alert_threshold")
          .eq("household_id", householdId)
          .eq("category_id", categoryId)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (budget) {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          const { data: spent } = await supabase
            .from("expenses")
            .select("amount")
            .eq("household_id", householdId)
            .eq("category_id", categoryId)
            .gte("date", startOfMonth.toISOString().split("T")[0]);

          const totalSpent = (spent || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
          const pct = totalSpent / Number(budget.amount);
          if (pct >= budget.alert_threshold) {
            budgetWarning = `Heads up — you've spent $${totalSpent.toFixed(2)} of your $${budget.amount} ${input.category} budget this month (${(pct * 100).toFixed(0)}%).`;
          }
        }
      }

      return {
        success: true,
        message: `Logged $${input.amount.toFixed(2)} expense${input.vendor ? ` at ${input.vendor}` : ""}`,
        budget_warning: budgetWarning,
        expense_id: data.id,
      };
    }

    case "draft_message": {
      // Look up contact
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, name, phone, email")
        .eq("household_id", householdId)
        .ilike("name", `%${input.contact_name}%`)
        .limit(1)
        .single();

      const { data: log } = await supabase.from("communication_log").insert({
        household_id: householdId,
        contact_id: contact?.id || null,
        sent_by: memberId,
        type: input.type,
        content: input.suggested_content,
        context: input.context || null,
        status: "drafted",
      }).select().single();

      return {
        success: true,
        message: `Message drafted for ${input.contact_name}`,
        contact_found: !!contact,
        contact_info: contact
          ? { name: contact.name, phone: contact.phone, email: contact.email }
          : null,
        draft_id: log?.id,
        draft_content: input.suggested_content,
        requires_approval: true,
      };
    }

    case "check_schedule_conflicts": {
      const dateStr = input.date;
      const { data: events } = await supabase
        .from("events")
        .select("title, starts_at, ends_at, location")
        .eq("household_id", householdId)
        .gte("starts_at", `${dateStr}T00:00:00`)
        .lte("starts_at", `${dateStr}T23:59:59`)
        .order("starts_at");

      return {
        success: true,
        date: dateStr,
        events: events || [],
        has_conflicts: (events || []).length > 0,
      };
    }

    case "get_budget_status": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      let query = supabase
        .from("expenses")
        .select("amount, category_id, expense_categories(name)")
        .eq("household_id", householdId)
        .gte("date", startOfMonth.toISOString().split("T")[0]);

      const { data: expenses } = await query;
      const { data: budgets } = await supabase
        .from("budgets")
        .select("amount, period, category_id, expense_categories(name)")
        .eq("household_id", householdId)
        .eq("is_active", true);

      const totalSpent = (expenses || []).reduce(
        (sum: number, e: any) => sum + Number(e.amount), 0
      );

      return {
        success: true,
        total_spent_this_month: totalSpent,
        expenses_count: (expenses || []).length,
        budgets: (budgets || []).map((b: any) => ({
          category: b.expense_categories?.name || "Unknown",
          budget: Number(b.amount),
          period: b.period,
        })),
      };
    }

    case "search_recipes": {
      // Search household recipes first, then suggest
      const { data: recipes } = await supabase
        .from("recipes")
        .select("title, description, ingredients, prep_time_min, cook_time_min, servings, tags, source_url")
        .or(`household_id.eq.${householdId},household_id.is.null`)
        .limit(10);

      return {
        success: true,
        recipes: recipes || [],
        ingredients_provided: input.ingredients || [],
        note: "If no matching recipes found, I'll suggest some based on common recipes for these ingredients.",
      };
    }

    case "add_maintenance_item": {
      const { data, error } = await supabase.from("maintenance_items").insert({
        household_id: householdId,
        category: input.category,
        title: input.title,
        description: input.description || null,
        asset_name: input.asset_name || null,
        frequency_days: input.frequency_days || null,
        next_due_at: input.next_due_at || null,
      }).select().single();

      if (error) return { success: false, error: error.message };

      // Check for other pending maintenance items to suggest bundling
      const { data: pending } = await supabase
        .from("maintenance_items")
        .select("title, category")
        .eq("household_id", householdId)
        .eq("category", input.category)
        .not("id", "eq", data.id)
        .limit(5);

      return {
        success: true,
        message: `Added "${input.title}" to your ${input.category} maintenance list`,
        item_id: data.id,
        other_pending: pending || [],
      };
    }

    case "find_local_service": {
      // Return tips and guidance (actual Google Places integration would go here)
      const tips: Record<string, string[]> = {
        plumber: [
          "Ask for references from recent jobs",
          "Make sure the main water shut-off is accessible before they arrive",
          "Know where your shut-off valve is",
          "Clear a path to the work area",
          "Since you're paying a trip charge, consider bundling other plumbing jobs",
          "Get at least 2-3 quotes before committing",
          "Ask if they're licensed and insured",
        ],
        electrician: [
          "Ask for their license number",
          "Get a written estimate before work begins",
          "Know where your electrical panel is",
          "Make sure the area is accessible",
          "Ask about warranties on their work",
        ],
        general: [
          "Always ask for references",
          "Get written estimates from 2-3 providers",
          "Verify they're licensed and insured",
          "Ask about warranties and guarantees",
          "Read Google and Better Business Bureau reviews",
        ],
      };

      return {
        success: true,
        service_type: input.service_type,
        tips: tips[input.service_type.toLowerCase()] || tips.general,
        note: `To find top-rated ${input.service_type} providers near you, I'd search Google Places for "${input.service_type}" with 4+ star ratings in your area. For now, here are tips to help you hire well.`,
        specific_need: input.specific_need,
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS
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

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get member and household info
    const { data: member } = await supabase
      .from("household_members")
      .select("id, household_id, display_name, role, households(name, settings)")
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return new Response(
        JSON.stringify({ error: "No household found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const householdId = member.household_id;
    const memberId = member.id;
    const householdContext = {
      household_name: (member as any).households?.name,
      member_name: member.display_name,
      member_role: member.role,
      timezone: ((member as any).households?.settings as any)?.timezone || "America/Toronto",
    };

    // Parse request
    const { message, conversation_history = [], image_base64 } = await req.json();

    // Build messages for Claude
    const messages: any[] = [
      ...conversation_history,
    ];

    // Handle image (receipt scanning)
    if (image_base64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: image_base64,
            },
          },
          {
            type: "text",
            text: message || "Please scan this receipt and extract the vendor, items, amounts, and total. Then log it as an expense.",
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    // Call Claude API
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

    // Process tool calls in a loop (Claude may chain multiple tools)
    const toolResults: any[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (result.stop_reason === "tool_use" && iterations < MAX_ITERATIONS) {
      iterations++;
      const assistantMessage = { role: "assistant", content: result.content };
      messages.push(assistantMessage);

      const toolUseBlocks = result.content.filter(
        (block: any) => block.type === "tool_use"
      );

      const toolResultContents: any[] = [];

      for (const toolUse of toolUseBlocks) {
        const toolResult = await executeTool(
          toolUse.name,
          toolUse.input,
          supabase,
          householdId,
          memberId
        );

        toolResults.push({
          tool: toolUse.name,
          input: toolUse.input,
          result: toolResult,
        });

        toolResultContents.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult),
        });
      }

      messages.push({ role: "user", content: toolResultContents });

      // Call Claude again with tool results
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

    // Extract text response
    const textBlocks = (result.content || []).filter(
      (block: any) => block.type === "text"
    );
    const responseText = textBlocks.map((b: any) => b.text).join("\n");

    // Log to audit
    await supabase.from("audit_log").insert({
      household_id: householdId,
      actor_id: memberId,
      action: "ai_assistant_interaction",
      entity_type: "conversation",
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
        actions_taken: toolResults.map((t) => ({
          action: t.tool,
          result: t.result,
        })),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
