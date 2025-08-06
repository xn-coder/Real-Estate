
'use server'

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
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
            where("role", "in", allPartnerRoles), 
            orderBy("createdAt", "desc")
        );
        const allPartnersSnapshot = await getDocs(q);

        if (allPartnersSnapshot.empty) {
            return [];
        }

        const availableRoles = addableRoles[currentUserRole as keyof typeof addableRoles] || [];

        // Filter on the server side
        const requestableList = allPartnersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as User))
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
