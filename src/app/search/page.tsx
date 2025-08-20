
'use client'

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { Loader2, Search, Building, User, Users, Handshake, ChevronRight, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

type SearchResult = {
  id: string
  title: string
  description: string
  type: 'Partner' | 'Seller' | 'Customer' | 'Property' | 'Lead' | 'Resource'
  href: string
  image?: string
}

const partnerRoles = ['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'];

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryParam = searchParams.get('q')

  const [isLoading, setIsLoading] = React.useState(true)
  const [results, setResults] = React.useState<SearchResult[]>([])

  const performSearch = React.useCallback(async (searchTerm: string) => {
    setIsLoading(true)
    setResults([])

    if (!searchTerm) {
      setIsLoading(false)
      return
    }

    const searchPromises = []

    // User Search
    const userQuery = query(
        collection(db, "users"),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(10)
    );
    searchPromises.push(getDocs(userQuery).then(snapshot => 
        snapshot.docs.map(doc => {
            const data = doc.data()
            let type: SearchResult['type'] = 'Customer'
            let href = `/manage-customer/${doc.id}`

            if (partnerRoles.includes(data.role)) {
                type = 'Partner'
                href = `/manage-partner/${doc.id}`
            } else if (data.role === 'seller') {
                type = 'Seller'
                href = `/manage-seller/details/${doc.id}`
            }
            
            return {
                id: doc.id,
                title: data.name,
                description: data.email,
                type: type,
                href: href,
                image: data.profileImage,
            } as SearchResult
        })
    ));

    // Property Search by Title
    const propertyTitleQuery = query(
        collection(db, "properties"),
        where('catalogTitle', '>=', searchTerm),
        where('catalogTitle', '<=', searchTerm + '\uf8ff'),
        limit(5)
    );
    searchPromises.push(getDocs(propertyTitleQuery).then(snapshot => 
        snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                title: data.catalogTitle,
                description: `${data.city}, ${data.state}`,
                type: 'Property',
                href: `/listings/${doc.id}`,
                image: '',
            } as SearchResult
        })
    ));

     // Property Search by ID
    const propertyIdQuery = query(
        collection(db, "properties"),
        where('id', '>=', searchTerm),
        where('id', '<=', searchTerm + '\uf8ff'),
        limit(5)
    );
     searchPromises.push(getDocs(propertyIdQuery).then(snapshot => 
        snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                title: data.catalogTitle,
                description: `ID: ${data.id}`,
                type: 'Property',
                href: `/listings/${doc.id}`,
                image: '',
            } as SearchResult
        })
    ));

    // Lead Search
     const leadQuery = query(
        collection(db, "leads"),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(10)
    );
     searchPromises.push(getDocs(leadQuery).then(snapshot => 
        snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                title: data.name,
                description: `Lead for property ${data.propertyId}`,
                type: 'Lead',
                href: `/manage-customer/${data.customerId}`, // Leads are viewed via customer profile
                image: '',
            } as SearchResult
        })
    ));
    
    // Resource Search
    const resourceQuery = query(
        collection(db, "resources"),
        where('title', '>=', searchTerm),
        where('title', '<=', searchTerm + '\uf8ff'),
        limit(10)
    );
    searchPromises.push(getDocs(resourceQuery).then(snapshot => 
        snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                title: data.title,
                description: `Type: ${data.contentType.charAt(0).toUpperCase() + data.contentType.slice(1)}`,
                type: 'Resource',
                href: `/support/resource/${doc.id}`,
                image: data.featureImage,
            } as SearchResult
        })
    ));


    try {
        const allResultSets = await Promise.all(searchPromises);
        const flattenedResults = allResultSets.flat();
        
        // Remove duplicates (e.g., if a property matches by both ID and title)
        const uniqueResults = Array.from(new Map(flattenedResults.map(item => [item.id, item])).values());
        
        setResults(uniqueResults);
    } catch (error) {
        console.error("Search failed:", error);
    } finally {
        setIsLoading(false);
    }
  }, [])

  React.useEffect(() => {
    if (queryParam) {
      performSearch(queryParam)
    } else {
        setIsLoading(false);
    }
  }, [queryParam, performSearch])

  const categorizedResults = React.useMemo(() => {
    return results.reduce((acc, result) => {
        if (!acc[result.type]) {
            acc[result.type] = [];
        }
        acc[result.type].push(result);
        return acc;
    }, {} as Record<SearchResult['type'], SearchResult[]>);
  }, [results]);

  const categoryIcons = {
      Partner: <Handshake className="h-5 w-5 text-muted-foreground" />,
      Seller: <User className="h-5 w-5 text-muted-foreground" />,
      Customer: <Users className="h-5 w-5 text-muted-foreground" />,
      Property: <Building className="h-5 w-5 text-muted-foreground" />,
      Lead: <User className="h-5 w-5 text-muted-foreground" />,
      Resource: <BookOpen className="h-5 w-5 text-muted-foreground" />,
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Search Results for "{queryParam}"
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="mx-auto h-12 w-12 mb-4" />
          <p>No results found.</p>
          <p className="text-sm">Try searching for something else.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(categorizedResults).map(([category, items]) => (
                <Card key={category}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           {categoryIcons[category as keyof typeof categoryIcons]}
                           {category}s
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                           {items.map(item => (
                               <li key={item.id}>
                                   <Link href={item.href} className="block p-2 -mx-2 rounded-md hover:bg-muted">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                 <Avatar className="h-9 w-9">
                                                    <AvatarImage src={item.image} />
                                                    <AvatarFallback>{item.title.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{item.title}</p>
                                                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        </div>
                                   </Link>
                               </li>
                           ))}
                        </ul>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
    </div>
  )
}
