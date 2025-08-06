
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
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, PlusCircle, Trash2, Pencil, Eye, FileText, Upload } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useUser } from "@/hooks/use-user"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, doc, setDoc, query, where, deleteDoc } from "firebase/firestore"
import { generateUserId } from "@/lib/utils"
import Image from "next/image"
import type { UserDocument } from "@/types/document"

const documentSchema = z.object({
  title: z.string().min(1, "Document title is required."),
  file: z.any().refine(file => file, "File is required."),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided"));
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function DocumentManagementPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const [documents, setDocuments] = React.useState<UserDocument[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isViewKycOpen, setIsViewKycOpen] = React.useState(false);
    const [kycToView, setKycToView] = React.useState<{ title: string, number?: string, url?: string } | null>(null);

    const form = useForm<DocumentFormValues>({
        resolver: zodResolver(documentSchema),
        defaultValues: { title: "" },
    });

    const fetchDocuments = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const docsRef = collection(db, `users/${user.id}/documents`);
            const q = query(docsRef);
            const snapshot = await getDocs(q);
            const docsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument));
            setDocuments(docsList);
        } catch (error) {
            console.error("Error fetching documents:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch documents." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    React.useEffect(() => {
        if (user) {
            fetchDocuments();
        }
    }, [user, fetchDocuments]);

    const handleFormSubmit = async (values: DocumentFormValues) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const fileUrl = await fileToDataUrl(values.file);
            const docId = generateUserId("DOC");
            await setDoc(doc(db, `users/${user.id}/documents`, docId), {
                id: docId,
                title: values.title,
                fileUrl: fileUrl,
                fileName: values.file.name,
                fileType: values.file.type,
            });
            toast({ title: "Document Uploaded", description: "Your document has been saved." });
            setIsDialogOpen(false);
            form.reset();
            fetchDocuments();
        } catch (error) {
            console.error("Error uploading document:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to upload document." });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDelete = async (docId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, `users/${user.id}/documents`, docId));
            toast({ title: "Document Deleted", description: "The document has been removed." });
            fetchDocuments();
        } catch (error) {
             console.error("Error deleting document:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete document." });
        }
    }
    
    const handleViewKyc = (title: string, number?: string, url?: string) => {
        setKycToView({ title, number, url });
        setIsViewKycOpen(true);
    }

    if (isUserLoading) {
        return <div className="flex-1 p-4 md:p-8 pt-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Document Management</h1>

            <Card>
                <CardHeader>
                    <CardTitle>KYC Documents</CardTitle>
                    <CardDescription>Your verified identification documents.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div className="border p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold">Aadhar Card</h4>
                            <p className="text-sm text-muted-foreground font-mono">{user?.aadharNumber || 'Not Provided'}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewKyc("Aadhar Card", user?.aadharNumber, user?.aadharFile)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                    </div>
                     <div className="border p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold">PAN Card</h4>
                            <p className="text-sm text-muted-foreground font-mono">{user?.panNumber || 'Not Provided'}</p>
                        </div>
                         <Button variant="outline" size="sm" onClick={() => handleViewKyc("PAN Card", user?.panNumber, user?.panFile)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Other Documents</CardTitle>
                            <CardDescription>Manage your additional business or personal documents.</CardDescription>
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Upload New Document</DialogTitle>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Document Title</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g., Business License" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="file"
                                            render={({ field: { onChange, ...rest }}) => (
                                                <FormItem>
                                                    <FormLabel>File</FormLabel>
                                                    <FormControl>
                                                        <Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <DialogFooter>
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Upload
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>File Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : documents.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No documents found.</TableCell></TableRow>
                                ) : (
                                    documents.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium">{doc.title}</TableCell>
                                            <TableCell className="text-muted-foreground">{doc.fileName}</TableCell>
                                            <TableCell className="text-right">
                                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                </a>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the document.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(doc.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             <Dialog open={isViewKycOpen} onOpenChange={setIsViewKycOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{kycToView?.title}</DialogTitle>
                    </DialogHeader>
                    {kycToView && (
                         <div className="space-y-4">
                             {kycToView.number && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Document Number</p>
                                    <p className="font-mono">{kycToView.number}</p>
                                </div>
                             )}
                            <div className="mt-2 border rounded-lg overflow-hidden max-h-96">
                                {kycToView.url ? <Image src={kycToView.url} alt={`${kycToView.title}`} width={500} height={300} className="w-full object-contain" /> : <p className="text-sm text-center p-8 text-muted-foreground">No file uploaded</p>}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewKycOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
