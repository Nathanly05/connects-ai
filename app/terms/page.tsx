import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/legal-page-shell";

export const metadata: Metadata = {
  title: "服务条款"
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="服务条款"
      description="使用 One AI 前，请先了解平台的基础服务规则。"
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">平台说明</h2>
        <p>
          One AI 是一个 AI 工具平台，面向中文用户提供 AI 聊天、智能创作和相关
          Remaining Chats 使用服务。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">合法使用</h2>
        <p>
          用户需遵守适用法律法规，不得使用 One AI 生成、传播或协助处理违法、
          侵权、欺诈、骚扰、仇恨、暴力或其他不当内容。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">禁止行为</h2>
        <p>
          禁止滥用平台服务，包括但不限于批量攻击、绕过访问限制、发送垃圾信息、
          恶意消耗系统资源、干扰平台稳定运行或影响其他用户正常使用。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">AI 内容免责声明</h2>
        <p>
          AI 回复仅供参考，不构成法律、医疗、金融、投资、税务或其他专业建议。
          用户应自行判断输出内容的准确性和适用性，并在必要时咨询专业人士。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">账号管理</h2>
        <p>
          平台可因违规、滥用、风险控制或安全原因暂停、限制或终止相关账号的使用权限。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Remaining Chats 说明</h2>
        <p>
          Remaining Chats 为 One AI 平台内使用额度，可用于发起 AI 对话，
          不代表现金账户、存款、证券或其他金融资产。
        </p>
      </section>
    </LegalPageShell>
  );
}
