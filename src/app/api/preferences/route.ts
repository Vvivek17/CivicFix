import { db } from "@/db";
import { civicPreferences, civicReports, civicUsers } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { ensurePreferences } from "@/lib/data";
import { saveMemoryPreferences, getMemoryPreferences } from "@/lib/memory-store";
import type { Preferences } from "@/lib/types";
import { and, eq, ne } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const neighborhood = typeof body.neighborhood === "string" ? body.neighborhood.trim() : "";

    if (
      name.length < 2 ||
      name.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 160 ||
      neighborhood.length < 2 ||
      neighborhood.length > 80 ||
      typeof body.notifications !== "boolean"
    ) {
      return Response.json({ error: "Please enter a valid name, email, and neighborhood." }, { status: 400 });
    }

    const isAuthority = user.role === "authority";
    let department = isAuthority ? (typeof body.department === "string" ? body.department.trim() : "") : undefined;
    let designation = isAuthority ? (typeof body.designation === "string" ? body.designation.trim() : "") : undefined;
    let badgeId = isAuthority ? (typeof body.badgeId === "string" ? body.badgeId.trim() : "") : undefined;
    let kgidNumber = isAuthority ? (typeof body.kgidNumber === "string" ? body.kgidNumber.trim() : "") : undefined;
    let ward = isAuthority ? (typeof body.ward === "string" ? body.ward.trim() : "") : undefined;
    let zone = isAuthority ? (typeof body.zone === "string" ? body.zone.trim() : "") : undefined;
    let phone = isAuthority ? (typeof body.phone === "string" ? body.phone.trim() : "") : undefined;
    let officeAddress = isAuthority ? (typeof body.officeAddress === "string" ? body.officeAddress.trim() : "") : undefined;
    let controlRoomHotline = isAuthority ? (typeof body.controlRoomHotline === "string" ? body.controlRoomHotline.trim() : "") : undefined;
    let onCallStatus = isAuthority ? (typeof body.onCallStatus === "string" ? body.onCallStatus.trim() : "") : undefined;
    let governmentGuaranteeReference = isAuthority ? (typeof body.governmentGuaranteeReference === "string" ? body.governmentGuaranteeReference.trim() : "") : undefined;

    if (isAuthority) {
      if (!department || department.length < 2 || department.length > 100) {
        return Response.json({ error: "Official Department is required for authority staff." }, { status: 400 });
      }
      if (!designation || designation.length < 2 || designation.length > 100) {
        return Response.json({ error: "Official Rank / Designation is required for authority staff." }, { status: 400 });
      }
      if (!badgeId || badgeId.length < 2 || badgeId.length > 60) {
        return Response.json({ error: "Official Employee Badge ID is required (e.g., BBMP-W151-8302)." }, { status: 400 });
      }
      if (!kgidNumber || kgidNumber.length < 2 || kgidNumber.length > 60) {
        return Response.json({ error: "KGID / HRMS Government Registration Number is required." }, { status: 400 });
      }
      if (!ward || ward.length < 2 || ward.length > 100) {
        return Response.json({ error: "Assigned Municipal Ward is required." }, { status: 400 });
      }
      if (!zone || zone.length < 2 || zone.length > 60) {
        return Response.json({ error: "Assigned Municipal Administrative Zone is required." }, { status: 400 });
      }
      if (!phone || phone.length < 5 || phone.length > 40) {
        return Response.json({ error: "Official Duty Phone Number is required." }, { status: 400 });
      }
      if (!officeAddress || officeAddress.length < 5 || officeAddress.length > 300) {
        return Response.json({ error: "Physical Ward Sub-Division Office Address is required." }, { status: 400 });
      }
      if (!controlRoomHotline || controlRoomHotline.length < 3 || controlRoomHotline.length > 80) {
        return Response.json({ error: "Municipal Control Room Hotline is required." }, { status: 400 });
      }
      if (!onCallStatus || onCallStatus.length < 2 || onCallStatus.length > 60) {
        return Response.json({ error: "On-Call / Duty Status is required." }, { status: 400 });
      }
      if (!governmentGuaranteeReference || governmentGuaranteeReference.length < 5 || governmentGuaranteeReference.length > 120) {
        return Response.json({ error: "Government Guarantee / Gazette Reference is required." }, { status: 400 });
      }
    }

    const payload: Partial<Preferences> = {
      name,
      email,
      neighborhood,
      notifications: body.notifications,
      ...(isAuthority ? {
        department,
        designation,
        badgeId,
        kgidNumber,
        ward,
        zone,
        phone,
        officeAddress,
        controlRoomHotline,
        onCallStatus,
        governmentGuaranteeReference,
      } : {}),
    };

    try {
      const [taken] = await db.select({ id: civicUsers.id }).from(civicUsers).where(and(eq(civicUsers.email, email), ne(civicUsers.id, user.id)));
      if (taken) return Response.json({ error: "That email is already used by another account." }, { status: 409 });

      await ensurePreferences(user);
      const preferences = await db.transaction(async (tx) => {
        await tx.update(civicUsers).set({ name, email }).where(eq(civicUsers.id, user.id));
        const [updated] = await tx.update(civicPreferences).set({
          name,
          email,
          neighborhood,
          notifications: body.notifications,
          department: department ?? null,
          designation: designation ?? null,
          badgeId: badgeId ?? null,
          kgidNumber: kgidNumber ?? null,
          ward: ward ?? null,
          zone: zone ?? null,
          phone: phone ?? null,
          officeAddress: officeAddress ?? null,
          controlRoomHotline: controlRoomHotline ?? null,
          onCallStatus: onCallStatus ?? null,
          governmentGuaranteeReference: governmentGuaranteeReference ?? null,
        }).where(eq(civicPreferences.id, String(user.id))).returning();
        await tx.update(civicReports).set({ reporterName: name, reporterEmail: email }).where(eq(civicReports.reporterId, user.id));
        return updated;
      });

      // Synchronize memory store
      const memPrefs = saveMemoryPreferences(String(user.id), {
        ...payload,
        following: preferences.following,
        voted: preferences.voted,
      });

      return Response.json({
        preferences: {
          name,
          email,
          neighborhood: preferences.neighborhood,
          notifications: preferences.notifications,
          following: preferences.following,
          voted: preferences.voted,
          department: preferences.department ?? department,
          designation: preferences.designation ?? designation,
          badgeId: preferences.badgeId ?? badgeId,
          kgidNumber: preferences.kgidNumber ?? kgidNumber,
          ward: preferences.ward ?? ward,
          zone: preferences.zone ?? zone,
          phone: preferences.phone ?? phone,
          officeAddress: preferences.officeAddress ?? officeAddress,
          controlRoomHotline: preferences.controlRoomHotline ?? controlRoomHotline,
          onCallStatus: preferences.onCallStatus ?? onCallStatus,
          governmentGuaranteeReference: preferences.governmentGuaranteeReference ?? governmentGuaranteeReference,
        },
      });
    } catch (dbErr) {
      console.warn("DB update failed during preferences save, falling back to memory store:", dbErr);
      const currentMem = getMemoryPreferences(user);
      const updatedMem = saveMemoryPreferences(String(user.id), {
        ...currentMem,
        ...payload,
      });
      return Response.json({ preferences: updatedMem });
    }
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: "Your preferences couldn’t be saved. Please try again." }, { status: 500 });
  }
}
