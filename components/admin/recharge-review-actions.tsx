"use client";

import { Check, X } from "lucide-react";
import {
  approveRechargeAction,
  rejectRechargeAction
} from "@/app/admin/recharges/actions";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RechargeReviewActions({ requestId }: { requestId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={approveRechargeAction}>
        <input type="hidden" name="requestId" value={requestId} />
        <Button type="submit" size="sm">
          <Check aria-hidden="true" />
          批准
        </Button>
      </form>

      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm">
            <X aria-hidden="true" />
            拒绝
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝充值申请</DialogTitle>
            <DialogDescription>
              请填写拒绝原因，用户后续可联系管理员处理。
            </DialogDescription>
          </DialogHeader>
          <form action={rejectRechargeAction} className="space-y-4">
            <input type="hidden" name="requestId" value={requestId} />
            <div className="space-y-2">
              <Label htmlFor={`reject-reason-${requestId}`}>拒绝原因</Label>
              <Textarea
                id={`reject-reason-${requestId}`}
                name="rejectReason"
                placeholder="例如：未查到对应付款记录"
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  取消
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive">
                确认拒绝
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
