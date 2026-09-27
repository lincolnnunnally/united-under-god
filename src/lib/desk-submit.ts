import {
  INQUIRY_UNREACHABLE,
  buildInquiryNotice,
  ownerFallbackNotice,
  unsavedOwnerNotice,
  type InquiryNoticeRow,
} from "./desk.ts";

type MailResult = { sent: number };

type DeskLists = {
  routes: { email: string; kinds: string; role: string }[];
  staff: {
    email: string;
    kinds: string;
    role: string;
    pickup: boolean;
    active: boolean;
  }[];
};

export type InquiryNotice = { to: string[]; subject: string; text: string };

export type SettledInquiry =
  | { ok: true; saved: true; emailed: boolean }
  | { ok: true; saved: false; emailed: true }
  | { ok: false; saved: false; emailed: false; error: string };

/**
 * Write first. If the write throws, email the owner the full inquiry with
 * NOT SAVED in the subject. A notify_routes failure is the caller's fallback.
 */
export async function settleInquirySubmit(args: {
  inquiry: InquiryNoticeRow;
  write: () => Promise<void>;
  notifySaved: (inquiry: InquiryNoticeRow) => Promise<MailResult>;
  sendUnsaved: (notice: InquiryNotice) => Promise<MailResult>;
}): Promise<SettledInquiry> {
  try {
    await args.write();
  } catch {
    console.error(`[desk] inquiry not saved kind=${args.inquiry.kind}`);
    let sent = 0;
    try {
      const mail = await args.sendUnsaved(unsavedOwnerNotice(args.inquiry));
      sent = mail.sent;
    } catch {
      console.error(`[desk-mail] unsaved email failed kind=${args.inquiry.kind}`);
    }
    if (sent > 0) return { ok: true, saved: false, emailed: true };
    return {
      ok: false,
      saved: false,
      emailed: false,
      error: INQUIRY_UNREACHABLE,
    };
  }

  try {
    const mail = await args.notifySaved(args.inquiry);
    return { ok: true, saved: true, emailed: mail.sent > 0 };
  } catch {
    console.error(`[desk-mail] notify failed kind=${args.inquiry.kind}`);
    return { ok: true, saved: true, emailed: false };
  }
}

/**
 * Prefer the desk routes. If that lookup (or the desk send) throws, email
 * lincoln@unitedundergod.org directly. The fallback notice does not read routes.
 */
export async function notifySavedInquiry(args: {
  inquiry: InquiryNoticeRow;
  loadRoutes: () => Promise<DeskLists>;
  sendDesk: (notice: InquiryNotice) => Promise<MailResult>;
  sendOwner: (notice: InquiryNotice) => Promise<MailResult>;
  extra?: string[];
}): Promise<MailResult> {
  try {
    const desk = await args.loadRoutes();
    const notice = buildInquiryNotice({
      inquiry: args.inquiry,
      routes: desk.routes,
      staff: desk.staff,
      extra: args.extra,
    });
    return await args.sendDesk(notice);
  } catch {
    console.error(`[desk-mail] notify routes failed kind=${args.inquiry.kind}`);
    return args.sendOwner(ownerFallbackNotice(args.inquiry));
  }
}
