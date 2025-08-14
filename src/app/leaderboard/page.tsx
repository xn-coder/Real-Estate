
'use client'

import * as React from "react"
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Lead } from "@/types/lead"
import type { User } from "@/types/user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Trophy, Medal, Award } from "lucide-react"

type PartnerLeaderboard = {
  partnerId: string;
  leadCount: number;
  partnerDetails?: User;
}

const rankIcons = [
    { icon: Trophy, color: "text-yellow-500", shadow: "shadow-yellow-500/50" },
    { icon: Medal, color: "text-gray-400", shadow: "shadow-gray-400/50" },
    { icon: Award, color: "text-orange-600", shadow: "shadow-orange-600/50" }
];

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = React.useState<PartnerLeaderboard[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const leadsSnapshot = await getDocs(collection(db, "leads"));
        const leads = leadsSnapshot.docs.map(doc => doc.data() as Lead);

        const leadCounts: { [key: string]: number } = {};
        for (const lead of leads) {
          if (lead.partnerId) {
            leadCounts[lead.partnerId] = (leadCounts[lead.partnerId] || 0) + 1;
          }
        }

        const leaderboardDataPromises = Object.entries(leadCounts).map(async ([partnerId, leadCount]) => {
          const partnerDoc = await getDoc(doc(db, "users", partnerId));
          return {
            partnerId,
            leadCount,
            partnerDetails: partnerDoc.exists() ? partnerDoc.data() as User : undefined,
          };
        });

        const leaderboardData = await Promise.all(leaderboardDataPromises);
        
        const sortedLeaderboard = leaderboardData
          .filter(item => item.partnerDetails) // Ensure partner details were fetched
          .sort((a, b) => b.leadCount - a.leadCount);
        
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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Leaderboard</h1>
      </div>
      
      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
        {/* 2nd Place */}
        <div className="order-2 md:order-1">
          {topThree[1] && (
             <Card className="text-center p-6 relative border-2 border-gray-400/50 shadow-lg">
                <Medal className="h-12 w-12 mx-auto text-gray-400 mb-4"/>
                <Avatar className="h-24 w-24 mx-auto mb-2 border-4 border-gray-400">
                    <AvatarImage src={topThree[1].partnerDetails?.profileImage} />
                    <AvatarFallback>{getInitials(topThree[1].partnerDetails?.name)}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{topThree[1].partnerDetails?.name}</h3>
                <p className="text-2xl font-black text-gray-500">{topThree[1].leadCount} Leads</p>
                <div className="absolute top-2 right-2 text-3xl font-extrabold text-gray-400">#2</div>
            </Card>
          )}
        </div>
         {/* 1st Place */}
         <div className="order-1 md:order-2">
           {topThree[0] && (
            <Card className="text-center p-8 relative border-2 border-yellow-500/50 shadow-2xl scale-105">
                <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4"/>
                 <Avatar className="h-32 w-32 mx-auto mb-2 border-4 border-yellow-500">
                    <AvatarImage src={topThree[0].partnerDetails?.profileImage} />
                    <AvatarFallback className="text-4xl">{getInitials(topThree[0].partnerDetails?.name)}</AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-bold">{topThree[0].partnerDetails?.name}</h3>
                <p className="text-3xl font-black text-yellow-600">{topThree[0].leadCount} Leads</p>
                <div className="absolute top-2 right-2 text-4xl font-extrabold text-yellow-500">#1</div>
            </Card>
           )}
        </div>
         {/* 3rd Place */}
        <div className="order-3 md:order-3">
          {topThree[2] && (
            <Card className="text-center p-6 relative border-2 border-orange-600/50 shadow-lg">
                <Award className="h-12 w-12 mx-auto text-orange-600 mb-4"/>
                 <Avatar className="h-24 w-24 mx-auto mb-2 border-4 border-orange-600">
                    <AvatarImage src={topThree[2].partnerDetails?.profileImage} />
                    <AvatarFallback>{getInitials(topThree[2].partnerDetails?.name)}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{topThree[2].partnerDetails?.name}</h3>
                <p className="text-2xl font-black text-orange-700">{topThree[2].leadCount} Leads</p>
                <div className="absolute top-2 right-2 text-3xl font-extrabold text-orange-600">#3</div>
            </Card>
          )}
        </div>
      </div>

      {/* Rest of the Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>All Partner Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rest.length > 0 ? rest.map((item, index) => (
                  <TableRow key={item.partnerId}>
                    <TableCell className="font-bold text-lg text-muted-foreground">{index + 4}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={item.partnerDetails?.profileImage} />
                          <AvatarFallback>{getInitials(item.partnerDetails?.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{item.partnerDetails?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{item.leadCount}</TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
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

