const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label, value) {
  return `
    <tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;white-space:nowrap;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;">
        ${escapeHtml(value || "-")}
      </td>
    </tr>
  `;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const {
      insuredName,
      insuredGender,
      insuredBirthDate,
      insuredAge,
      insuredSmoking,
      insuredResidence,

      sameAsInsured,
      policyHolderName,
      policyHolderGender,
      policyHolderBirthDate,
      policyHolderAge,
      policyHolderSmoking,
      policyHolderResidence,

      company,
      productName,
      paymentTerm,
      paymentFrequency,
      coverageTerm,
      policyCurrency,
      amountInputType,
      annualPremium,

      withdrawalPlan,
      remarks,
    } = body;

    if (!insuredName || (!insuredBirthDate && !insuredAge)) {
      return res.status(400).json({
        ok: false,
        message: "受保人姓名必填，且出生日期和投保年龄至少填写一项",
      });
    }

    if (!sameAsInsured) {
      if (!policyHolderName || (!policyHolderBirthDate && !policyHolderAge)) {
        return res.status(400).json({
          ok: false,
          message: "投保人与受保人不一致时，投保人姓名必填，且出生日期和年龄至少填写一项",
        });
      }
    }

    const toEmail = process.env.RESEND_TO_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!toEmail || !fromEmail) {
      return res.status(500).json({
        ok: false,
        message: "邮件服务环境变量未配置完整",
      });
    }

    const html = `
      <div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;padding:20px;color:#111827;">
        <h2 style="margin:0 0 16px;">新建计划书信息</h2>
        <table style="border-collapse:collapse;width:100%;max-width:900px;">
          ${row("受保人姓名", insuredName)}
          ${row("受保人性别", insuredGender)}
          ${row("受保人出生日期", insuredBirthDate)}
          ${row("投保年龄", insuredAge)}
          ${row("是否吸烟", insuredSmoking)}
          ${row("居住地", insuredResidence)}

          ${row("投保人与受保人一致", sameAsInsured ? "是" : "否")}
          ${row("投保人姓名", sameAsInsured ? "与受保人一致" : policyHolderName)}
          ${row("投保人性别", sameAsInsured ? "与受保人一致" : policyHolderGender)}
          ${row("投保人出生日期", sameAsInsured ? "与受保人一致" : policyHolderBirthDate)}
          ${row("投保人年龄", sameAsInsured ? "与受保人一致" : policyHolderAge)}
          ${row("投保人是否吸烟", sameAsInsured ? "与受保人一致" : policyHolderSmoking)}
          ${row("投保人居住地", sameAsInsured ? "与受保人一致" : policyHolderResidence)}

          ${row("保险公司", company)}
          ${row("产品名称", productName)}
          ${row("缴付年期", paymentTerm)}
          ${row("缴费频率", paymentFrequency)}
          ${row("保障期限", coverageTerm)}
          ${row("保单货币", policyCurrency)}
          ${row("金额输入方式", amountInputType)}
          ${row("年缴保费", annualPremium)}

          ${row("提取计划", withdrawalPlan)}
          ${row("备注", remarks)}
        </table>
      </div>
    `;

    const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [toEmail],
    subject: "新预约提交通知",
    html,
    replyTo: toEmail,
    });

    console.log("resend result:", { data, error });

    if (error) {
    console.error("resend error:", error);
    return res.status(500).json({
        ok: false,
        message: error.message || "邮件发送失败",
    });
    }

    return res.status(200).json({
    ok: true,
    id: data?.id || null,
    });

  } catch (error) {
    console.error("submit error:", error);
    return res.status(500).json({
      ok: false,
      message: "邮件发送失败，请稍后再试",
    });
  }
};
