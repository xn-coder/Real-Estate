
'use server'

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { User } from "@/types/user";

const addableRoles: Record<string, string[]> = {
    franchisee: ['channel', 'associate', 'super_affiliate', 'affiliate'],
    channel: ['associate', 'super_affiliate', 'affiliate'],
    associate: ['super_affiliate', 'affiliate'],
};

const allPartnerRoles = ['franchisee', 'channel', 'associate', 'super_affiliate', 'affiliate'];

export async function getAvailablePartners(currentUserId: string, currentUserRole: string): Promise<User[]> {
    try {
        const usersCollection = collection(db, "users");
        
        // Fetch all users that have a partner role
        const q = query(
            usersCollection, 
            where("role", "in", allPartnerRoles)
        );
        const allPartnersSnapshot = await getDocs(q);

        if (allPartnersSnapshot.empty) {
            return [];
        }

        const availableRoles = addableRoles[currentUserRole as keyof typeof addableRoles] || [];

        // Filter on the server side and serialize the data
        const requestableList = allPartnersSnapshot.docs
            .map(doc => {
                const data = doc.data();
                // Convert Firestore Timestamps to serializable format (ISO string)
                if (data.dob && data.dob instanceof Timestamp) {
                    data.dob = data.dob.toDate().toISOString();
                }
                if (data.createdAt && data.createdAt instanceof Timestamp) {
                    data.createdAt = data.createdAt.toDate().toISOString();
                }
                return { id: doc.id, ...data } as User;
            })
            .filter(partner => 
                !partner.teamLeadId &&                  // Not already in a team
                partner.id !== currentUserId &&        // Not the user themselves
                availableRoles.includes(partner.role)  // Is a role the current user can add
            );
        
        return requestableList;

    } catch (error) {
        console.error("Error fetching available partners:", error);
        throw new Error("Could not fetch available partners.");
    }
}
