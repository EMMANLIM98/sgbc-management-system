/**
 * Membership Context Factory
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  SupabaseMemberRepository,
  SupabaseMemberDocumentRepository,
} from "./membership.repositories";
import { MemberService } from "../application/membership.service";

export interface MembershipContext {
  memberService: MemberService;
}

export function createMembershipContext(supabaseClient: SupabaseClient): MembershipContext {
  const memberRepo = new SupabaseMemberRepository(supabaseClient);
  const documentRepo = new SupabaseMemberDocumentRepository(supabaseClient);
  const memberService = new MemberService(memberRepo, documentRepo);

  return { memberService };
}
