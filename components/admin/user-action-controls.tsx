"use client";

import { Ban, Check, Minus, Plus, ShieldCheck, X } from "lucide-react";
import {
  addCreditsAction,
  approveUserAction,
  approveUserWithoutFreeCreditsAction,
  banUserAction,
  rejectUserAction,
  removeCreditsAction
} from "@/app/admin/users/actions";
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

type UserActionControlsProps = {
  userId: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "banned";
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
  const title = isAdd ? "增加对话次数" : "减少对话次数";
  const description = isAdd
    ? `为 ${email} 手动增加对话次数。`
    : `从 ${email} 手动扣减对话次数，扣减后余额不能小于 0。`;
  const defaultReason = isAdd ? "管理员手动充值" : "管理员手动扣减";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={isAdd ? "outline" : "secondary"} size="sm" className="w-full sm:w-auto">
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
            当前余额：<span className="font-medium text-foreground">{credits}</span> chats
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-${userId}-amount`}>数量</Label>
            <Input
              id={`${mode}-${userId}-amount`}
              name="amount"
              type="number"
              min={1}
              step={1}
              placeholder="例如：50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-${userId}-reason`}>备注</Label>
            <Input
              id={`${mode}-${userId}-reason`}
              name="reason"
              defaultValue={defaultReason}
              placeholder={defaultReason}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" variant={isAdd ? "default" : "secondary"} className="w-full sm:w-auto">
              确认{isAdd ? "增加" : "减少"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UserActionControls({
  userId,
  email,
  status,
  credits
}: UserActionControlsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      {status === "pending" ? (
        <>
          <form action={approveUserAction} className="w-full sm:w-auto">
            <input type="hidden" name="userId" value={userId} />
            <Button type="submit" size="sm" className="w-full sm:w-auto">
              <Check aria-hidden="true" />
              批准并发放
            </Button>
          </form>
          <form action={approveUserWithoutFreeCreditsAction} className="w-full sm:w-auto">
            <input type="hidden" name="userId" value={userId} />
            <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
              <ShieldCheck aria-hidden="true" />
              批准不发
            </Button>
          </form>
          <form action={rejectUserAction} className="w-full sm:w-auto">
            <input type="hidden" name="userId" value={userId} />
            <Button type="submit" variant="destructive" size="sm" className="w-full sm:w-auto">
              <X aria-hidden="true" />
              拒绝
            </Button>
          </form>
        </>
      ) : null}
      {status !== "banned" ? (
        <form action={banUserAction} className="w-full sm:w-auto">
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" variant="destructive" size="sm" className="w-full sm:w-auto">
            <Ban aria-hidden="true" />
            封禁
          </Button>
        </form>
      ) : null}
      <CreditDialog mode="add" userId={userId} email={email} credits={credits} />
      <CreditDialog mode="remove" userId={userId} email={email} credits={credits} />
    </div>
  );
}
