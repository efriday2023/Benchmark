// Netlify serverless function: /.netlify/functions/audit
// Keeps the Anthropic API key private on the server side.
// Set ANTHROPIC_API_KEY as an environment variable in Netlify site settings.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let input;
  try {
    input = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  const {
    name = "This athlete",
    sport = "their sport",
    followers = "not provided",
    avgViews = "not provided",
    engagementPct = "not provided",
    niche = "not provided",
    mainPlatform = "not provided",
  } = input;

  const prompt = `You are a sharp, no-fluff NIL (Name, Image, Likeness) social media consultant writing an audit for a college athlete. Use the data below. Where data is missing, reason from what IS provided rather than inventing specific numbers.

ATHLETE: ${name}, ${sport}
Main platform: ${mainPlatform}
Followers: ${followers}
Avg views per post: ${avgViews}
Engagement rate: ${engagementPct}%
Content niche: ${niche}

Respond with ONLY valid JSON (no markdown, no code fences, no preamble) matching this exact structure:
{
  "engagementScore": <integer 1-100>,
  "brandReadyScore": <integer 1-100>,
  "growthPotential": <integer 1-100>,
  "whatsWorking": ["short bullet", "short bullet"],
  "whatsNot": ["short bullet", "short bullet"],
  "brandReadiness": "one short paragraph, 2-3 sentences",
  "actionItems": ["specific action", "specific action", "specific action", "specific action"]
}

Keep bullets under 20 words each. Be specific and direct, not generic. Do not use em dashes or en dashes anywhere in your response, write around them instead.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || "Anthropic API error" }),
      };
    }

    const textBlock = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const clean = textBlock.replace(/```json|```/g, "").trim();
    const audit = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(audit),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error generating audit" }),
    };
  }
};
