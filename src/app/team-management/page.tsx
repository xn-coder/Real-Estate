
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, doc, setDoc, query, where } from "firebase/firestore"
import bcrypt from "bcryptjs"
import { generateUserId } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, PlusCircle, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUser } from "@/hooks/use-user"
import type { User as TeamMember } from "@/types/user"
import { Badge } from "@/components/ui/badge"

const roleNameMapping: Record<string, string> = {
  affiliate: 'Affiliate Partner',
  super_affiliate: 'Super Affiliate Partner',
  associate: 'Associate Partner',
  channel: 'Channel Partner',
  franchisee: 'Franchisee',
};

const addableRoles = {
  franchisee: ['channel', 'associate', 'super_affiliate', 'affiliate'],
  channel: ['channel', 'associate', 'super_affiliate', 'affiliate'],
  associate: ['super_affiliate', 'affiliate'],
};

const formSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  email: z.string().email("A valid email is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.string().min(1, "Please select a role."),
})

type AddTeamMemberForm = z.infer<typeof formSchema>

export default function TeamManagementPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const form = useForm<AddTeamMemberForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const canManageTeam = user?.role && ['franchisee', 'channel', 'associate'].includes(user.role);

  const fetchTeamMembers = React.useCallback(async () => {
    if (!user || !canManageTeam) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const usersCollection = collection(db, "users");
      const q = query(usersCollection, where("teamLeadId", "==", user.id));
      const snapshot = await getDocs(q);
      const membersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
      setTeamMembers(membersList);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch team members." });
    } finally {
      setIsLoading(false);
    }
  }, [user, canManageTeam, toast]);

  React.useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const onSubmit = async (values: AddTeamMemberForm) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", values.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            toast({ variant: "destructive", title: "Error", description: "A user with this email already exists." });
            setIsSubmitting(false);
            return;
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(values.password, salt);
        const [firstName, ...lastNameParts] = values.name.split(' ');
        const lastName = lastNameParts.join(' ');
        const userId = generateUserId("P");

        await setDoc(doc(db, "users", userId), {
            id: userId,
            name: values.name,
            firstName,
            lastName,
            email: values.email,
            phone: values.phone,
            password: hashedPassword,
            role: values.role,
            status: 'active',
            teamLeadId: user.id,
        });

        toast({ title: "Team Member Added", description: "The new member has been added to your team." });
        setIsDialogOpen(false);
        form.reset();
        fetchTeamMembers();
    } catch (error) {
        console.error("Error adding team member:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to add team member." });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isUserLoading) {
    return <div className="flex-1 p-4 md:p-8 pt-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!canManageTeam) {
    return (
        <div className="flex-1 p-4 md:p-8 pt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to manage a team.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  const availableRoles = addableRoles[user!.role as keyof typeof addableRoles] || [];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Team Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Team Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Team Member</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {availableRoles.map(role => (
                                <SelectItem key={role} value={role}>{roleNameMapping[role]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                <FormMessage /></FormItem>)} />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Member
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
          <CardDescription>A list of partners you have added to your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : teamMembers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">No team members found.</TableCell></TableRow>
                ) : (
                  teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell><Badge variant="outline">{roleNameMapping[member.role]}</Badge></TableCell>
                      <TableCell><Badge className="capitalize">{member.status}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
