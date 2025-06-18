"use client";
import { useSyncUserToDB } from "@/hooks/useSyncUserToDB";

export default function UserSyncer() {
    useSyncUserToDB();
    return null;
}

