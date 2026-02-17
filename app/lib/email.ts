import { Resend } from "resend";
import { ScoredPost, DailyScanResult } from "./types";

const resend = new Resend(process.env.RESEND_API_KEY);

function buildEmailHtml(result: DailyScanResult): string {
  const date = new Date(result.scanTimestamp).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; background: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 24px; border-radius: 12px; margin-bottom: 20px;">
        <h1 style="color: #f97316; margin: 0; font-size: 24px;">Reddit Scout Daily Report</h1>
        <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">${date}</p>
        <p style="color: #cbd5e1; margin: 8px 0 0 0; font-size: 14px;">
          Scanned: ${result.totalFetched} posts | Filtered: ${result.totalPassedFilter} | Opportunities: ${result.totalScored}
        </p>
      </div>
  `;

  result.posts.forEach((post: ScoredPost, i: number) => {
    const ageStr =
      post.ageHours < 24
        ? `${post.ageHours}h ago`
        : `${Math.floor(post.ageHours / 24)}d ago`;

    const spamColor =
      post.spamRiskLevel === "low"
        ? "#22c55e"
        : post.spamRiskLevel === "medium"
          ? "#eab308"
          : "#ef4444";

    const scoreColor =
      post.overallScore >= 8.5
        ? "#10b981"
        : post.overallScore >= 7.5
          ? "#22c55e"
          : "#eab308";

    html += `
      <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="background: #1e293b; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">
            #${i + 1} &bull; r/${post.subreddit}
          </span>
          <div>
            <span style="background: ${scoreColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">
              ${post.overallScore}/10
            </span>
            <span style="background: ${spamColor}20; color: ${spamColor}; border: 1px solid ${spamColor}40; padding: 4px 10px; border-radius: 20px; font-size: 11px; margin-left: 6px;">
              ${post.spamRiskLevel} risk
            </span>
          </div>
        </div>

        <a href="${post.permalink}" style="color: #0f172a; text-decoration: none; font-size: 16px; font-weight: 600; line-height: 1.4;">
          ${post.title}
        </a>

        <p style="color: #64748b; font-size: 13px; margin: 8px 0;">
          ⬆ ${post.upvotes} &bull; 💬 ${post.commentsCount} &bull; ${ageStr} &bull;
          <span style="color: #7c3aed; font-weight: 600;">${post.relevantProduct}</span>
        </p>

        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px; margin: 10px 0;">
          <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 600;">Pain Type: ${post.painType}</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 8px 0;">
          <strong>Why:</strong> ${post.whyGoodOpportunity}
        </p>

        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px; margin: 10px 0;">
          <p style="margin: 0; font-size: 13px; color: #9a3412;">
            <strong>Suggested Angle:</strong> ${post.suggestedCommentAngle}
          </p>
        </div>

        <div style="display: flex; gap: 12px; font-size: 12px; color: #64748b; margin-top: 10px;">
          <span>Pain: ${post.scores.costPainIntensity}/10</span>
          <span>Relevance: ${post.scores.relevanceToAutomation}/10</span>
          <span>Opportunity: ${post.scores.commentOpportunityStrength}/10</span>
          <span>Promo Risk: ${post.scores.riskOfSoundingPromotional}/10</span>
        </div>

        <a href="${post.permalink}" style="display: inline-block; background: #f97316; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; margin-top: 12px;">
          View on Reddit →
        </a>
      </div>
    `;
  });

  html += `
      <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;">
        Reddit Scout by ZopDev &mdash; Powered by OpenAI
      </div>
    </div>
  `;

  return html;
}

export async function sendDailyEmail(
  result: DailyScanResult
): Promise<boolean> {
  const toEmail = process.env.REPORT_EMAIL;
  if (!toEmail) {
    console.log("[Email] No REPORT_EMAIL set, skipping email");
    return false;
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] No RESEND_API_KEY set, skipping email");
    return false;
  }

  const date = new Date(result.scanTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  try {
    await resend.emails.send({
      from: "Reddit Scout <onboarding@resend.dev>",
      to: toEmail,
      subject: `Reddit Scout: ${result.totalScored} opportunities found (${date})`,
      html: buildEmailHtml(result),
    });
    console.log(`[Email] Daily report sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}
