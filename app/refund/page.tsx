import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/legal-page-shell";

export const metadata: Metadata = {
  title: "退款政策"
};

export default function RefundPage() {
  return (
    <LegalPageShell
      title="退款政策"
      description="以下政策用于说明 Stripe 与 GlobePay 充值的基础退款处理方式。"
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Stripe 支付</h2>
        <p>
          通过 Stripe 完成的支付，如需退款，可联系客服处理。平台会根据订单状态、
          Remaining Chats 使用情况和支付渠道规则进行核实。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Remaining Chats 使用后退款</h2>
        <p>
          已大量使用的 Remaining Chats 一般不支持退款。若存在异常扣费、重复付款或其他特殊情况，
          请尽快联系管理员核实。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">GlobePay 微信/支付宝充值</h2>
        <p>
          GlobePay 微信/支付宝充值需人工核实。管理员会根据付款截图、付款备注、
          充值申请和到账情况进行处理。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">异常情况</h2>
        <p>
          如遇重复付款、充值未到账、金额填写错误或套餐选择错误，可联系管理员协助核查。
        </p>
      </section>

      <section className="space-y-3 rounded-lg border bg-secondary/50 p-4">
        <h2 className="text-base font-semibold text-foreground">联系方式</h2>
        <p>管理员微信：wishmelucky555</p>
      </section>
    </LegalPageShell>
  );
}
