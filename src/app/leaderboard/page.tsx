
'use client'

import * as React from "react"
import { collection, query, getDocs, doc, getDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Lead } from "@/types/lead"
import type { User } from "@/types/user"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Trophy, Medal, Award, Crown } from "lucide-react"

type PartnerLeaderboard = {
  partnerId: string;
  dealCount: number;
  totalDealValue: number;
  partnerDetails?: User;
}

const rankIcons = [
    { icon: Trophy, color: "text-yellow-400", shadow: "shadow-yellow-500/50" },
    { icon: Medal, color: "text-gray-400", shadow: "shadow-gray-400/50" },
    { icon: Award, color: "text-orange-500", shadow: "shadow-orange-600/50" }
];

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = React.useState<PartnerLeaderboard[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const leadsQuery = query(collection(db, "leads"), where("status", "in", ["Completed", "Deal closed"]));
        const leadsSnapshot = await getDocs(leadsQuery);
        const leads = leadsSnapshot.docs.map(doc => doc.data() as Lead);

        const partnerStats: { [key: string]: { dealCount: number; totalDealValue: number } } = {};

        for (const lead of leads) {
          if (lead.partnerId) {
            if (!partnerStats[lead.partnerId]) {
              partnerStats[lead.partnerId] = { dealCount: 0, totalDealValue: 0 };
            }
            partnerStats[lead.partnerId].dealCount++;
            partnerStats[lead.partnerId].totalDealValue += lead.closingAmount || 0;
          }
        }

        const leaderboardDataPromises = Object.entries(partnerStats).map(async ([partnerId, stats]) => {
          const partnerDoc = await getDoc(doc(db, "users", partnerId));
          return {
            partnerId,
            ...stats,
            partnerDetails: partnerDoc.exists() ? partnerDoc.data() as User : undefined,
          };
        });

        const leaderboardData = await Promise.all(leaderboardDataPromises);
        
        const sortedLeaderboard = leaderboardData
          .filter(item => item.partnerDetails) // Ensure partner details were fetched
          .sort((a, b) => b.dealCount - a.dealCount || b.totalDealValue - a.totalDealValue);
        
        setLeaderboard(sortedLeaderboard);

      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('') : '';

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Partner Leaderboard</h1>
        <p className="text-muted-foreground mt-2">See who's leading the pack this season.</p>
      </div>
      
      {/* Top 3 Podium */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
        {/* 2nd Place */}
        <div className="order-2 md:order-1">
          {topThree[1] && (
             <Card className="text-center p-6 relative border-2 border-gray-400/50 shadow-lg bg-card transform hover:scale-105 transition-transform duration-300">
                <Medal className="h-12 w-12 mx-auto text-gray-400 mb-4"/>
                <Avatar className="h-24 w-24 mx-auto mb-2 border-4 border-gray-400">
                    <AvatarImage src={topThree[1].partnerDetails?.profileImage} />
                    <AvatarFallback>{getInitials(topThree[1].partnerDetails?.name)}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{topThree[1].partnerDetails?.name}</h3>
                <p className="text-muted-foreground text-sm">#2 Rank</p>
                <div className="mt-4 flex justify-around divide-x">
                    <div className="px-2"><p className="text-2xl font-black text-gray-500">{topThree[1].dealCount}</p><p className="text-xs text-muted-foreground">Deals</p></div>
                    <div className="px-2"><p className="text-2xl font-black text-gray-500">₹{topThree[1].totalDealValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Value</p></div>
                </div>
            </Card>
          )}
        </div>
         {/* 1st Place */}
         <div className="order-1 md:order-2">
           {topThree[0] && (
            <Card className="text-center p-8 relative border-2 border-yellow-500/50 shadow-2xl scale-105 bg-card transform hover:scale-110 transition-transform duration-300">
                <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4"/>
                 <Avatar className="h-32 w-32 mx-auto mb-2 border-4 border-yellow-500">
                    <AvatarImage src={topThree[0].partnerDetails?.profileImage} />
                    <AvatarFallback className="text-4xl">{getInitials(topThree[0].partnerDetails?.name)}</AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-bold">{topThree[0].partnerDetails?.name}</h3>
                <p className="text-muted-foreground text-sm">#1 Rank</p>
                <div className="mt-4 flex justify-around divide-x">
                    <div className="px-2"><p className="text-3xl font-black text-yellow-600">{topThree[0].dealCount}</p><p className="text-xs text-muted-foreground">Deals</p></div>
                    <div className="px-2"><p className="text-3xl font-black text-yellow-600">₹{topThree[0].totalDealValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Value</p></div>
                </div>
            </Card>
           )}
        </div>
         {/* 3rd Place */}
        <div className="order-3 md:order-3">
          {topThree[2] && (
            <Card className="text-center p-6 relative border-2 border-orange-600/50 shadow-lg bg-card transform hover:scale-105 transition-transform duration-300">
                <Award className="h-12 w-12 mx-auto text-orange-600 mb-4"/>
                 <Avatar className="h-24 w-24 mx-auto mb-2 border-4 border-orange-600">
                    <AvatarImage src={topThree[2].partnerDetails?.profileImage} />
                    <AvatarFallback>{getInitials(topThree[2].partnerDetails?.name)}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{topThree[2].partnerDetails?.name}</h3>
                <p className="text-muted-foreground text-sm">#3 Rank</p>
                <div className="mt-4 flex justify-around divide-x">
                    <div className="px-2"><p className="text-2xl font-black text-orange-700">{topThree[2].dealCount}</p><p className="text-xs text-muted-foreground">Deals</p></div>
                    <div className="px-2"><p className="text-2xl font-black text-orange-700">₹{topThree[2].totalDealValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Value</p></div>
                </div>
            </Card>
          )}
        </div>
      </div>

      {/* Rest of the Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>All Partner Rankings</CardTitle>
          <CardDescription>Full list of all partner rankings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Deals Closed</TableHead>
                  <TableHead className="text-right">Total Deal Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rest.length > 0 ? rest.map((item, index) => (
                  <TableRow key={item.partnerId}>
                    <TableCell className="font-bold text-lg text-muted-foreground text-center">{index + 4}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={item.partnerDetails?.profileImage} />
                          <AvatarFallback>{getInitials(item.partnerDetails?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                           <p className="font-medium">{item.partnerDetails?.name}</p>
                           <p className="text-xs text-muted-foreground font-mono">{item.partnerDetails?.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{item.dealCount}</TableCell>
                    <TableCell className="text-right font-semibold">₹{item.totalDealValue.toLocaleString()}</TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No other partners found in the leaderboard.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
