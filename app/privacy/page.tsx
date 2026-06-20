import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/legal-page-shell";

export const metadata: Metadata = {
  title: "隐私政策"
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="隐私政策"
      description="我们重视用户隐私，并尽量以清晰方式说明数据如何被使用。"
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">收集的信息</h2>
        <p>
          One AI 可能收集用户邮箱、登录信息、聊天记录、充值记录、
          Remaining Chats 变动记录以及与账号安全相关的基础使用信息。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">数据用途</h2>
        <p>
          数据主要用于账号管理、身份验证、AI 服务调用、聊天历史展示、充值处理、
          Remaining Chats 管理、安全风控、客服支持和产品体验改进。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">数据共享</h2>
        <p>
          One AI 不主动出售用户数据。为提供服务，部分必要数据可能会由 Supabase、
          OpenAI、Stripe 等服务提供商处理。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">数据删除</h2>
        <p>
          用户可联系管理员请求删除账号数据。收到请求后，平台会根据账号状态、充值记录、
          安全和合规要求进行核实与处理。
        </p>
      </section>

      <section className="space-y-3 rounded-lg border bg-secondary/50 p-4">
        <h2 className="text-base font-semibold text-foreground">联系方式</h2>
        <p>管理员微信：wishmelucky555</p>
      </section>
    </LegalPageShell>
  );
}
