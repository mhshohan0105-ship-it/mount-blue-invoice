"use client";

import { ErrorBox, Loading } from "@/components/load-state";
import { getNextMemoNo, getSettings } from "@/lib/store";
import { useDb } from "@/lib/use-db";
import { BackupSection } from "./backup-section";
import { SettingsForm } from "./settings-form";

export default function SettingsPage() {
  const { data, error, reload } = useDb(() => Promise.all([getSettings(), getNextMemoNo()]), []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : (
        // key forces the form to pick up restored values after a backup import
        <SettingsForm key={JSON.stringify(data)} settings={data[0]} nextMemoNo={data[1]} />
      )}
      <BackupSection onRestored={reload} />
    </div>
  );
}
