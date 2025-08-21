
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
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Pencil, Search, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import type { Property } from "@/types/property"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

type CatalogType = 'defaultCatalog' | 'partnerFeaturedCatalog' | 'recommendedCatalog';

const featuredPropertiesSchema = z.object({
    propertyIds: z.array(z.string()).max(6, "You can select a maximum of 6 properties."),
});
type FeaturedPropertiesForm = z.infer<typeof featuredPropertiesSchema>;

export default function FeaturedPropertiesPage() {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = React.useState(true)
    const [allProperties, setAllProperties] = React.useState<Property[]>([])
    const [featuredProperties, setFeaturedProperties] = React.useState<Record<CatalogType, Property[]>>({
        defaultCatalog: [],
        partnerFeaturedCatalog: [],
        recommendedCatalog: [],
    })
    const [editingCatalog, setEditingCatalog] = React.useState<CatalogType | null>(null);
    const [propertySearchTerm, setPropertySearchTerm] = React.useState("");


    const form = useForm<FeaturedPropertiesForm>({
        resolver: zodResolver(featuredPropertiesSchema),
        defaultValues: { propertyIds: [] },
    })

    const fetchFeaturedProperties = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const propsQuery = query(collection(db, "properties"), where("status", "==", "For Sale"));
            const propsSnapshot = await getDocs(propsQuery);
            const propsData = propsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
            setAllProperties(propsData);

            const defaultsDoc = await getDoc(doc(db, "app_settings", "website_defaults"));
            if (defaultsDoc.exists()) {
                const data = defaultsDoc.data();
                const getPropsByIds = (ids: unknown) => {
                    if (!Array.isArray(ids)) return [];
                    return propsData.filter(p => ids.includes(p.id));
                };
                
                setFeaturedProperties({
                    defaultCatalog: getPropsByIds(data.featuredCatalog),
                    partnerFeaturedCatalog: getPropsByIds(data.partnerFeaturedCatalog),
                    recommendedCatalog: getPropsByIds(data.recommendedCatalog),
                });
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load featured properties." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    React.useEffect(() => {
        fetchFeaturedProperties();
    }, [fetchFeaturedProperties]);

    const handleEditClick = (type: CatalogType) => {
        setEditingCatalog(type);
        const currentIds = featuredProperties[type].map(p => p.id);
        form.reset({ propertyIds: currentIds });
    };

    const handleSave = async (values: FeaturedPropertiesForm) => {
        if (!editingCatalog) return;

        const fieldMap: Record<CatalogType, string> = {
            defaultCatalog: 'featuredCatalog',
            partnerFeaturedCatalog: 'partnerFeaturedCatalog',
            recommendedCatalog: 'recommendedCatalog'
        };
        const firestoreField = fieldMap[editingCatalog];

        try {
            const docRef = doc(db, "app_settings", "website_defaults");
            await setDoc(docRef, { [firestoreField]: values.propertyIds }, { merge: true });
            toast({ title: "Success", description: "Featured properties updated successfully." });
            setEditingCatalog(null);
            await fetchFeaturedProperties();
        } catch (error) {
            console.error("Error updating featured properties:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save changes." });
        }
    }
    
    const PropertyList = ({ title, description, properties, onEdit }: { title: string, description: string, properties: Property[], onEdit: () => void }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 h-4 w-4"/>Edit</Button>
            </CardHeader>
            <CardContent>
                {isLoading ? <Loader2 className="animate-spin" /> : (
                    <div className="space-y-4">
                        {properties.length > 0 ? properties.map(prop => (
                            <div key={prop.id} className="flex items-center gap-4 p-2 border rounded-md">
                                <Image src={prop.featureImage || 'https://placehold.co/120x68.png'} alt={prop.catalogTitle} width={100} height={56} className="rounded-md object-cover bg-muted" />
                                <div className="flex-1">
                                    <p className="font-semibold">{prop.catalogTitle}</p>
                                    <p className="text-sm text-muted-foreground">{prop.city}, {prop.state}</p>
                                </div>
                            </div>
                        )) : <p className="text-sm text-muted-foreground text-center py-4">No properties selected.</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
    
    const filteredProperties = React.useMemo(() => {
        return allProperties.filter(prop => 
            prop.catalogTitle.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
            prop.id.toLowerCase().includes(propertySearchTerm.toLowerCase())
        );
    }, [allProperties, propertySearchTerm]);


    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/listings">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Featured Properties</h1>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <PropertyList 
                    title="Default Catalog"
                    description="Default properties for new partner sites."
                    properties={featuredProperties.defaultCatalog}
                    onEdit={() => handleEditClick('defaultCatalog')}
                />
                <PropertyList 
                    title="Partner Featured Catalog"
                    description="Featured properties for all partners."
                    properties={featuredProperties.partnerFeaturedCatalog}
                    onEdit={() => handleEditClick('partnerFeaturedCatalog')}
                />
                <PropertyList 
                    title="Recommended Catalog"
                    description="Recommended properties across the platform."
                    properties={featuredProperties.recommendedCatalog}
                    onEdit={() => handleEditClick('recommendedCatalog')}
                />
            </div>
            
            <Dialog open={!!editingCatalog} onOpenChange={(open) => !open && setEditingCatalog(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Featured Properties</DialogTitle>
                        <DialogDescription>Select up to 6 properties to feature.</DialogDescription>
                    </DialogHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or code..."
                            value={propertySearchTerm}
                            onChange={(e) => setPropertySearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSave)} className="flex-1 flex flex-col gap-4 min-h-0">
                            <FormField
                                control={form.control}
                                name="propertyIds"
                                render={({ field }) => (
                                    <FormItem className="flex-1 flex flex-col min-h-0">
                                        <div className="overflow-y-auto space-y-2 border p-2 rounded-md">
                                            {filteredProperties.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-row items-center space-x-3 space-y-0 p-2 hover:bg-muted rounded-md"
                                                >
                                                    <Checkbox
                                                        checked={field.value?.includes(item.id)}
                                                        onCheckedChange={(checked) => {
                                                            const currentValues = field.value || [];
                                                            if (checked) {
                                                                if (currentValues.length < 6) {
                                                                    field.onChange([...currentValues, item.id]);
                                                                } else {
                                                                    toast({ variant: "destructive", title: "Limit Reached", description: "You can only select up to 6 properties." });
                                                                }
                                                            } else {
                                                                field.onChange(currentValues.filter((value) => value !== item.id));
                                                            }
                                                        }}
                                                    />
                                                    <FormLabel className="font-normal w-full cursor-pointer">
                                                        <p>{item.catalogTitle}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
                                                    </FormLabel>
                                                </div>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setEditingCatalog(null)}>Cancel</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

        </div>
    )
}
