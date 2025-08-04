
'use client'

import * as React from "react"
import type { User } from "@/types/user"
import { Phone, Mail, MapPin, Briefcase, Globe } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

interface DigitalCardProps {
    partner: User;
    websiteData: User['website'];
}

export default function DigitalCard({ partner, websiteData }: DigitalCardProps) {

  const getInitials = () => {
    if (partner?.firstName && partner?.lastName) {
      return `${partner.firstName.charAt(0)}${partner.lastName.charAt(0)}`
    }
    if (partner?.name) {
      return partner.name.split(' ').map(n => n[0]).join('');
    }
    return 'P'
  }

  const partnerContact = websiteData?.contactDetails || partner;
  const fullAddress = [partnerContact.address, partnerContact.city, partnerContact.state, partnerContact.pincode].filter(Boolean).join(', ');
  const whatsappNumber = partnerContact.phone?.replace(/\D/g, '');

  return (
    <div className="flex items-center justify-center min-h-full p-4">
      <div className="w-full max-w-sm mx-auto bg-card rounded-xl shadow-lg overflow-hidden border">
        <div className="relative">
          <div className="h-32 bg-gradient-to-r from-teal-400 to-cyan-500"></div>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Avatar className="h-24 w-24 border-4 border-card">
              <AvatarImage src={partner.profileImage} alt={partner.name} />
              <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="text-center pt-16 pb-6 px-6">
          <h2 className="text-2xl font-bold font-headline">{partnerContact.name}</h2>
          <p className="text-muted-foreground font-mono text-sm">{partner.id}</p>
        </div>
        <div className="px-6 pb-8 space-y-4">
          <div className="flex items-center gap-4">
            <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{partnerContact.phone}</span>
          </div>
          <div className="flex items-center gap-4">
            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{partnerContact.email}</span>
          </div>
           <div className="flex items-start gap-4">
            <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm">{fullAddress}</span>
          </div>
           <div className="flex items-center gap-4">
            <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{roleNameMapping[partner.role] || partner.role}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" className="w-full rounded-none bg-card hover:bg-muted py-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              WhatsApp
            </Button>
          </a>
           <Link href={`/site/${partner.id}`}>
            <Button variant="ghost" className="w-full rounded-none bg-card hover:bg-muted py-4">
                <Globe className="h-5 w-5 mr-2" />
                Website
            </Button>
           </Link>
        </div>
      </div>
    </div>
  )
}
