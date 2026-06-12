"use client";
import React, { useCallback } from "react";
import { Search, Heart, Filter, FileText } from "lucide-react";
import { useProductListing } from "@/api/handlers";
import { useAppStore } from "@/store/use-app-store";
import { useRouter, useSearchParams } from "next/navigation";
import { useWishlist, useAddToWishlist, useRemoveFromWishlist, useFilters } from "@/api/handlers";
import type { Product } from "@/api/services";
import Image from "next/image";
import ShimmerLoader from "@/components/ShimmerLoader";
import FilterShimmerLoader from "@/components/FilterShimmerLoader";
import ContactFormModal from "@/components/ContactFormModal";
import RFQModal from "@/components/RFQModal";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";

const ProductPage: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer, isAuthenticated } = useAppStore();

  const categoryFilter = searchParams.get("category");
  const countryFilter = searchParams.get("country");
  const subCategoryFilter = searchParams.get("subCategory");
  const applicationFilter = searchParams.get("application");
  const tagFilter = searchParams.get("tag");
  const functionFilter = searchParams.get("function");

  const [contactModalOpen, setContactModalOpen] = React.useState(false);
  const [rfqModalOpen, setRfqModalOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<{ id: string; name: string } | null>(null);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(categoryFilter ? [categoryFilter] : []);
  const [selectedSubCategories, setSelectedSubCategories] = React.useState<string[]>(subCategoryFilter ? subCategoryFilter.split(",").filter(Boolean) : []);
  const [selectedApplications, setSelectedApplications] = React.useState<string[]>(applicationFilter ? applicationFilter.split(",").filter(Boolean) : []);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(tagFilter ? tagFilter.split(",").filter(Boolean) : []);
  const [selectedFunctions, setSelectedFunctions] = React.useState<string[]>(functionFilter ? functionFilter.split(",").filter(Boolean) : []);
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(countryFilter ? [countryFilter] : []);

  const updateURL = useCallback((categories: string[], countries: string[], subCategories: string[], applications: string[], tags: string[], functions: string[]) => {
    const params = new URLSearchParams();
    if (categories.length > 0) params.set("category", categories.join(","));
    if (countries.length > 0) params.set("country", countries.join(","));
    if (subCategories.length > 0) params.set("subCategory", subCategories.join(","));
    if (applications.length > 0) params.set("application", applications.join(","));
    if (tags.length > 0) params.set("tag", tags.join(","));
    if (functions.length > 0) params.set("function", functions.join(","));
    router.replace(params.toString() ? `/product?${params.toString()}` : "/product", { scroll: false });
  }, [router]);

  React.useEffect(() => {
    const newCategories = categoryFilter ? categoryFilter.split(",").filter(Boolean) : [];
    const newCountries = countryFilter ? countryFilter.split(",").filter(Boolean) : [];
    const newSubCategories = subCategoryFilter ? subCategoryFilter.split(",").filter(Boolean) : [];
    const newApplications = applicationFilter ? applicationFilter.split(",").filter(Boolean) : [];
    const newTags = tagFilter ? tagFilter.split(",").filter(Boolean) : [];
    const newFunctions = functionFilter ? functionFilter.split(",").filter(Boolean) : [];
    setSelectedCategories((p) => JSON.stringify(p) !== JSON.stringify(newCategories) ? newCategories : p);
    setSelectedCountries((p) => JSON.stringify(p) !== JSON.stringify(newCountries) ? newCountries : p);
    setSelectedSubCategories((p) => JSON.stringify(p) !== JSON.stringify(newSubCategories) ? newSubCategories : p);
    setSelectedApplications((p) => JSON.stringify(p) !== JSON.stringify(newApplications) ? newApplications : p);
    setSelectedTags((p) => JSON.stringify(p) !== JSON.stringify(newTags) ? newTags : p);
    setSelectedFunctions((p) => JSON.stringify(p) !== JSON.stringify(newFunctions) ? newFunctions : p);
  }, [categoryFilter, countryFilter, subCategoryFilter, applicationFilter, tagFilter, functionFilter]);

  const { data: wishlistData } = useWishlist({ customerId: customer?.id || "" }, { enabled: isAuthenticated && !!customer?.id });
  const addToWishlistMutation = useAddToWishlist();
  const removeFromWishlistMutation = useRemoveFromWishlist();
  const { data: filtersData, isLoading: filtersLoading } = useFilters();

  const productListingParams = {
    page, limit: 12, sortBy: "createdAt" as const, sortOrder: "desc" as const,
    category: selectedCategories.length > 0 ? selectedCategories[0] : undefined,
    subCategory: selectedSubCategories.length > 0 ? selectedSubCategories : undefined,
    application: selectedApplications.length > 0 ? selectedApplications : undefined,
    tag: selectedTags.length > 0 ? selectedTags : undefined,
    function: selectedFunctions.length > 0 ? selectedFunctions : undefined,
    countryOfOrigin: selectedCountries.length > 0 ? selectedCountries[0] : undefined,
  };

  const { data: response, isLoading, error, isError } = useProductListing(productListingParams);

  const isInWishlist = (productId: string): boolean => {
    if (!wishlistData?.data?.products) return false;
    return wishlistData.data.products.some((p) => p._id === productId);
  };

  const handleWishlistToggle = async (productId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isAuthenticated || !customer?.id) { router.push("/sign_in"); return; }
    const isCurrentlyInWishlist = isInWishlist(productId);
    try {
      if (isCurrentlyInWishlist) {
        await removeFromWishlistMutation.mutateAsync({ customerId: customer.id, productId });
        toast.info("Product removed from wishlist successfully!");
      } else {
        await addToWishlistMutation.mutateAsync({ customerId: customer.id, productId });
        toast.success("Product added to wishlist successfully!");
      }
    } catch (error) {
      console.error("Wishlist operation failed:", error);
      toast.error("Failed to update wishlist. Please try again.");
    }
  };

  const clearAllFilters = () => {
    setSelectedCategories([]); setSelectedSubCategories([]); setSelectedApplications([]); setSelectedTags([]); setSelectedFunctions([]); setSelectedCountries([]); setPage(1);
    setSearchQuery("");
    updateURL([], [], [], [], [], []);
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedSubCategories.length > 0 || selectedApplications.length > 0 || selectedTags.length > 0 || selectedFunctions.length > 0 || selectedCountries.length > 0;

  const products = response?.products || [];
  const pagination = response?.pagination;

  const filteredProducts = searchQuery.trim()
    ? products.filter((p: Product) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const toggleFilter = (list: string[], setList: (v: string[]) => void, slug: string) => {
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
    setList(next);
    setPage(1);
    return next;
  };

  const catToggle = (slug: string) => {
    const next = toggleFilter(selectedCategories, setSelectedCategories, slug);
    updateURL(next, selectedCountries, selectedSubCategories, selectedApplications, selectedTags, selectedFunctions);
  };
  const subCatToggle = (slug: string) => {
    const next = toggleFilter(selectedSubCategories, setSelectedSubCategories, slug);
    updateURL(selectedCategories, selectedCountries, next, selectedApplications, selectedTags, selectedFunctions);
  };
  const appToggle = (slug: string) => {
    const next = toggleFilter(selectedApplications, setSelectedApplications, slug);
    updateURL(selectedCategories, selectedCountries, selectedSubCategories, next, selectedTags, selectedFunctions);
  };
  const tagToggle = (slug: string) => {
    const next = toggleFilter(selectedTags, setSelectedTags, slug);
    updateURL(selectedCategories, selectedCountries, selectedSubCategories, selectedApplications, next, selectedFunctions);
  };
  const funcToggle = (slug: string) => {
    const next = toggleFilter(selectedFunctions, setSelectedFunctions, slug);
    updateURL(selectedCategories, selectedCountries, selectedSubCategories, selectedApplications, selectedTags, next);
  };
  const countryToggle = (slug: string) => {
    const next = toggleFilter(selectedCountries, setSelectedCountries, slug);
    updateURL(selectedCategories, next, selectedSubCategories, selectedApplications, selectedTags, selectedFunctions);
  };

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          Error loading products: {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  const FilterCheckboxGroup = ({ label, items, selectedItems, onToggle }: { label: string; items: { slug?: string; countryCode?: string; name?: string; productCount?: number }[]; selectedItems: string[]; onToggle: (slug: string) => void }) => {
    if (!items || items.length === 0) return null;
    return (
      <>
        <div>
          <h3 className="font-medium mb-3 text-sm text-primary">{label}</h3>
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const slug = item.slug || item.countryCode;
              const name = item.name || item.countryCode;
              const count = item.productCount;
              const checked = selectedItems.includes(slug);
              return (
                <div key={slug} className="flex items-center gap-2">
                  <Checkbox
                    id={`filter-${label}-${slug}`}
                    checked={checked}
                    onCheckedChange={() => onToggle(slug)}
                  />
                  <Label
                    htmlFor={`filter-${label}-${slug}`}
                    className="text-xs sm:text-sm font-normal cursor-pointer"
                  >
                    {name}
                    {count > 0 && <span className="text-muted-foreground ml-1">({count})</span>}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
        <Separator />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with search */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Our Products
            </h1>
            <div className="relative w-full sm:max-w-2xl sm:flex-1 sm:mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Button
              onClick={() => setContactModalOpen(true)}
              className="w-full sm:w-auto gap-2 whitespace-nowrap"
            >
              <FileText size={16} />
              Request Brochure
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 sm:gap-8">
            {/* Filters Sidebar */}
            <div className="w-full md:w-64 md:flex-shrink-0">
              <div className="md:sticky md:top-24 border border-border rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Filter size={16} />
                    Filters
                  </h2>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="max-h-[320px] md:max-h-[calc(100vh-200px)] overflow-y-auto pr-1 scrollbar-thin">
                  {filtersLoading ? (
                    <FilterShimmerLoader />
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      <FilterCheckboxGroup label="Category" items={filtersData?.data?.category || []} selectedItems={selectedCategories} onToggle={catToggle} />
                      <FilterCheckboxGroup label="Sub Category" items={filtersData?.data?.subCategory || []} selectedItems={selectedSubCategories} onToggle={subCatToggle} />
                      <FilterCheckboxGroup label="Application" items={filtersData?.data?.application || []} selectedItems={selectedApplications} onToggle={appToggle} />
                      <FilterCheckboxGroup label="Function" items={filtersData?.data?.function || []} selectedItems={selectedFunctions} onToggle={funcToggle} />
                      <FilterCheckboxGroup label="Tags" items={filtersData?.data?.tag || []} selectedItems={selectedTags} onToggle={tagToggle} />
                      <FilterCheckboxGroup label="Country of Origin" items={filtersData?.data?.countryOfOrigin || []} selectedItems={selectedCountries} onToggle={countryToggle} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              {isLoading ? (
                <ShimmerLoader count={12} />
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? `No results for "${searchQuery}". Try a different search term.`
                      : "No products found matching your criteria."}
                  </p>
                  {(hasActiveFilters || searchQuery) && (
                    <Button
                      variant="outline"
                      onClick={() => { clearAllFilters(); }}
                      className="mt-4"
                    >
                      {searchQuery ? "Clear Search" : "Clear All Filters"}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {filteredProducts.map((product: Product, index: number) => (
                      <div
                        key={product._id}
                        className="group cursor-pointer"
                        style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both` }}
                        onClick={() => router.push(`/product/detail/${product._id}`)}
                      >
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full">
                          <div className="relative h-32 sm:h-48 overflow-hidden">
                            <Image
                              src={product.bannerImage ? (product.bannerImage.startsWith("http") ? product.bannerImage : `${process.env.NEXT_PUBLIC_API_URL}/${product.bannerImage}`) : "/placeholder.svg"}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <button
                              className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                              onClick={(e) => handleWishlistToggle(product._id, e)}
                            >
                              <Heart className={`w-4 h-4 ${isInWishlist(product._id) ? "fill-red-500 stroke-red-500" : "stroke-foreground"}`} />
                            </button>
                            {!product.inStock && (
                              <span className="absolute top-2 right-2 text-xs font-medium text-white bg-red-500/80 px-2 py-0.5 rounded-full">
                                Out of Stock
                              </span>
                            )}
                          </div>
                          <div className="p-3 sm:p-4">
                            <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2 line-clamp-2">{product.name}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">{product.description || "Premium, lab-tested raw material trusted by manufacturers."}</p>
                            {product.appearance && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                                  {product.appearance}
                                </span>
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-12">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-9 h-9 text-sm rounded-lg font-medium transition-colors ${
                            p === page
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeInUp{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}`}</style>

      <ContactFormModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        source="product_page"
        onSuccess={() => toast.success("Thank you! Your message has been sent successfully.")}
        onError={(error) => toast.error(error)}
      />
      <RFQModal
        open={rfqModalOpen}
        onClose={() => { setRfqModalOpen(false); setSelectedProduct(null); }}
        productId={selectedProduct?.id}
        productName={selectedProduct?.name || ""}
        onSuccess={() => toast.success("Thank you! Your RFQ has been submitted successfully.")}
        onError={(error) => toast.error(error)}
      />
    </div>
  );
};

export default ProductPage;
