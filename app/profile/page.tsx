import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth/user";
import ProfileForm from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await getUserId();
  const profile = await db.getProfile(userId);

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold md:text-4xl">Profile &amp; targets</h1>
      <p className="mt-1 text-muted">
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
