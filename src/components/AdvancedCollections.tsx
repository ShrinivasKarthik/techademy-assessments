import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Folder,
  FolderPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  Star,
  StarOff,
  Move,
  Copy,
  Search,
  Filter,
  Grid3X3,
  List,
  ArrowUpDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  created_at: string;
  parent_collection_id: string | null;
  collection_type: string;
  color: string;
  is_favorite: boolean;
  sort_order: number;
  question_count?: number;
  children?: Collection[];
}

const COLLECTION_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
];

export default function AdvancedCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_collection_id: '',
    collection_type: 'folder',
    color: 'blue',
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user]);

  const fetchCollections = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch collections with question counts
      const { data, error } = await supabase
        .from('question_collections')
        .select(`
          *,
          collection_questions(count)
        `)
        .eq('creator_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Transform data and build hierarchy
      const collectionsWithCounts = data?.map(c => ({
        ...c,
        question_count: c.collection_questions?.[0]?.count || 0
      })) || [];

      const hierarchyMap = buildCollectionHierarchy(collectionsWithCounts);
      setCollections(hierarchyMap);
      
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast({
        title: "Error",
        description: "Failed to fetch collections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildCollectionHierarchy = (flatCollections: Collection[]) => {
    const collectionMap = new Map<string, Collection>();
    const rootCollections: Collection[] = [];

    // Create map of all collections
    flatCollections.forEach(collection => {
      collectionMap.set(collection.id, { ...collection, children: [] });
    });

    // Build hierarchy
    flatCollections.forEach(collection => {
      const current = collectionMap.get(collection.id)!;
      
      if (collection.parent_collection_id) {
        const parent = collectionMap.get(collection.parent_collection_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(current);
        }
      } else {
        rootCollections.push(current);
      }
    });

    return rootCollections;
  };

  const createCollection = async () => {
    if (!user || !formData.name.trim()) return;

    try {
      const { error } = await supabase
        .from('question_collections')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          creator_id: user.id,
          parent_collection_id: formData.parent_collection_id || null,
          collection_type: formData.collection_type,
          color: formData.color,
        });

      if (error) throw error;

      toast({
        title: "Collection Created",
        description: `"${formData.name}" has been created successfully`,
      });

      setShowCreateModal(false);
      resetForm();
      await fetchCollections();
      
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: "Error",
        description: "Failed to create collection",
        variant: "destructive",
      });
    }
  };

  const updateCollection = async (id: string, updates: Partial<Collection>) => {
    try {
      const { error } = await supabase
        .from('question_collections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Collection Updated",
        description: "Collection has been updated successfully",
      });

      await fetchCollections();
      
    } catch (error) {
      console.error('Error updating collection:', error);
      toast({
        title: "Error",
        description: "Failed to update collection",
        variant: "destructive",
      });
    }
  };

  const deleteCollection = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('question_collections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Collection Deleted",
        description: `"${name}" has been deleted successfully`,
      });

      await fetchCollections();
      
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast({
        title: "Error",
        description: "Failed to delete collection",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = async (collection: Collection) => {
    await updateCollection(collection.id, {
      is_favorite: !collection.is_favorite
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent_collection_id: '',
      collection_type: 'folder',
      color: 'blue',
    });
    setSelectedCollection(null);
  };

  const getColorClass = (color: string) => {
    const colorConfig = COLLECTION_COLORS.find(c => c.value === color);
    return colorConfig?.class || 'bg-blue-500';
  };

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCollection = (collection: Collection, level: number = 0) => {
    const isExpanded = expandedFolders.has(collection.id);
    const hasChildren = collection.children && collection.children.length > 0;

    return (
      <div key={collection.id} className="space-y-2">
        <Card className={`${level > 0 ? 'ml-6' : ''} hover:shadow-md transition-shadow`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-4 h-4 rounded-full ${getColorClass(collection.color)}`} />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{collection.name}</h3>
                    {collection.is_favorite && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    <Badge variant="outline">
                      {collection.question_count || 0} questions
                    </Badge>
                    {collection.collection_type === 'smart' && (
                      <Badge variant="secondary">Smart</Badge>
                    )}
                  </div>
                  
                  {collection.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {collection.description}
                    </p>
                  )}
                </div>

                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newExpanded = new Set(expandedFolders);
                      if (isExpanded) {
                        newExpanded.delete(collection.id);
                      } else {
                        newExpanded.add(collection.id);
                      }
                      setExpandedFolders(newExpanded);
                    }}
                  >
                    <Folder className={`h-4 w-4 ${isExpanded ? 'rotate-90' : ''} transition-transform`} />
                  </Button>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => toggleFavorite(collection)}
                  >
                    {collection.is_favorite ? (
                      <>
                        <StarOff className="mr-2 h-4 w-4" />
                        Remove from Favorites
                      </>
                    ) : (
                      <>
                        <Star className="mr-2 h-4 w-4" />
                        Add to Favorites
                      </>
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCollection(collection);
                      setFormData({
                        name: collection.name,
                        description: collection.description || '',
                        parent_collection_id: collection.parent_collection_id || '',
                        collection_type: collection.collection_type,
                        color: collection.color,
                      });
                      setShowCreateModal(true);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem>
                    <Move className="mr-2 h-4 w-4" />
                    Move
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem
                    onClick={() => deleteCollection(collection.id, collection.name)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div className="space-y-2">
            {collection.children!.map(child => renderCollection(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Collections</h1>
          <p className="text-muted-foreground">
            Organize your questions into structured collections and folders
          </p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCollection ? 'Edit Collection' : 'Create New Collection'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Collection name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select 
                    value={formData.collection_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, collection_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="folder">Folder</SelectItem>
                      <SelectItem value="collection">Collection</SelectItem>
                      <SelectItem value="smart">Smart Collection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select 
                    value={formData.color} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLECTION_COLORS.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color.class}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={createCollection} className="w-full">
                {selectedCollection ? 'Update Collection' : 'Create Collection'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="question_count">Question Count</SelectItem>
                  <SelectItem value="updated_at">Last Modified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collections Display */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse bg-muted h-16 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCollections.length > 0 ? (
          filteredCollections.map(collection => renderCollection(collection))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Collections Found</h3>
                <p className="text-muted-foreground mb-4">
                  {collections.length === 0 
                    ? "Create your first collection to organize your questions"
                    : "No collections match your search criteria"
                  }
                </p>
                {collections.length === 0 && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Create Your First Collection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}