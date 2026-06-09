import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";
import ProfileForm from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await getUserId();
  const profile = await db.getProfile(userId);

  return (
    <section>
      <h1>Profile &amp; targets</h1>
      <p className="muted">
        These targets drive your dashboard and what the coach reasons about.
      </p>
      <ProfileForm
        initial={
          profile && {
            targetCalories: profile.targetCalories,
            targetProteinG: profile.targetProteinG,
            goalWeightKg: profile.goalWeightKg,
            dietaryPreferences: profile.dietaryPreferences,
          }
        }
      />
    </section>
  );
}
