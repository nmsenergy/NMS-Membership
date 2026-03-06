import { z } from "zod";
import { adminProcedure } from "./_core/trpc";
import { getMemberByReferralCode } from "./db";

export const downloadTemplate = adminProcedure.mutation(async () => {
  const XLSX = await import("xlsx");
  const templateData = [
    {
      openId: "user_001",
      name: "张三",
      phone: "60123456789",
      birthday: "1990-01-15",
      referralCode: "推荐人码",
      rank: "VIP",
    },
    {
      openId: "user_002",
      name: "李四",
      phone: "60187654321",
      birthday: "1995-06-20",
      referralCode: "推荐人码",
      rank: "VIP",
    },
  ];
  
  const ws = XLSX.utils.json_to_sheet(templateData);
  ws["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  
  const instructionData = [
    ["会员批量导入操作说明"],
    [""],
    ["字段说明:"],
    ["openId", "用户唯一标识，必填，不能重复"],
    ["name", "会员姓名，必填"],
    ["phone", "手机号码，选填"],
    ["birthday", "生日日期，格式YYYY-MM-DD，选填"],
    ["referralCode", "推荐人的推荐码，选填"],
    ["rank", "会员等级，必填，可选值：VIP, M-AGENT, SM, GM, CEO"],
    [""],
    ["注意事项:"],
    ["1. openId必须唯一，系统会检查重复"],
    ["2. 如果openId已存在，该行会被跳过"],
    ["3. referralCode必须是有效的推荐码"],
    ["4. 每行最多处理一条记录"],
    ["5. 导入过程中出错的行会被记录"],
  ];
  
  const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
  XLSX.utils.book_append_sheet(wb, instructionWs, "说明");
  
  const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return { base64: buf, filename: "会员导入模板.xlsx" };
});

export const validateImport = adminProcedure
  .input(
    z.object({
      data: z.array(
        z.object({
          openId: z.string(),
          name: z.string(),
          phone: z.string().optional(),
          birthday: z.string().optional(),
          referralCode: z.string().optional(),
          rank: z.string().optional(),
        })
      ),
    })
  )
  .mutation(async ({ input }) => {
    const errors: Array<{ row: number; error: string }> = [];
    const validRanks = ["VIP", "M-AGENT", "SM", "GM", "CEO"];

    for (let i = 0; i < input.data.length; i++) {
      const row = input.data[i];
      if (!row.openId?.trim()) errors.push({ row: i + 1, error: "openId不能为空" });
      if (!row.name?.trim()) errors.push({ row: i + 1, error: "name不能为空" });
      if (row.rank && !validRanks.includes(row.rank)) {
        errors.push({ row: i + 1, error: `rank必须是以下之一: ${validRanks.join(", ")}` });
      }
      if (row.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(row.birthday)) {
        errors.push({ row: i + 1, error: "birthday格式必须为YYYY-MM-DD" });
      }
      if (row.referralCode) {
        const ref = await getMemberByReferralCode(row.referralCode);
        if (!ref) errors.push({ row: i + 1, error: "referralCode无效" });
      }
    }

    return { valid: errors.length === 0, errors, totalRows: input.data.length };
  });
