"use client";

import { Check, Minus, Plus, X } from "lucide-react";
import {
  addCreditsAction,
  approveUserAction,
  rejectUserAction,
  removeCreditsAction
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminUserActionControlsProps = {
  userId: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  credits: number;
};

type CreditDialogProps = {
  mode: "add" | "remove";
  userId: string;
  email: string;
  credits: number;
};

function CreditDialog({ mode, userId, email, credits }: CreditDialogProps) {
  const isAdd = mode === "add";
  const action = isAdd ? addCreditsAction : removeCreditsAction;
  const title = isAdd ? "增加 credits" : "减少 credits";
  const description = isAdd
    ? `为 ${email} 手动增加 credits。`
    : `从 ${email} 手动扣减 credits，扣减后余额不能小于 0。`;
  const defaultReason = isAdd ? "管理员手动充值" : "管理员手动扣减";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={isAdd ? "outline" : "secondary"} size="sm">
          {isAdd ? <Plus aria-hidden="true" /> : <Minus aria-hidden="true" />}
          {isAdd ? "增加" : "减少"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />
          <div className="rounded-md border bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
            当前余额：<span className="font-medium text-foreground">{credits}</span> credits
          </div>
          <div className="space-y-2">
            <Label htmlFor={`admin-${mode}-${userId}-amount`}>数量</Label>
            <Input
              id={`admin-${mode}-${userId}-amount`}
              name="amount"
              type="number"
              min={1}
              step={1}
              placeholder="例如：50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`admin-${mode}-${userId}-reason`}>备注</Label>
            <Input
              id={`admin-${mode}-${userId}-reason`}
              name="reason"
              defaultValue={defaultReason}
              placeholder={defaultReason}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" variant={isAdd ? "default" : "secondary"}>
              确认{isAdd ? "增加" : "减少"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminUserActionControls({
  userId,
  email,
  status,
  credits
}: AdminUserActionControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pending" ? (
        <form action={approveUserAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" size="sm">
            <Check aria-hidden="true" />
            批准
          </Button>
        </form>
      ) : null}
      {status !== "rejected" ? (
        <form action={rejectUserAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" variant="destructive" size="sm">
            <X aria-hidden="true" />
            拒绝
          </Button>
        </form>
      ) : null}
      <CreditDialog mode="add" userId={userId} email={email} credits={credits} />
      <CreditDialog mode="remove" userId={userId} email={email} credits={credits} />
    </div>
  );
}
