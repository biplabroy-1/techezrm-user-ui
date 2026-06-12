"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { Heart, MessageCircle, Mail, Share2, ShoppingCart, Plus, Minus, Send } from "lucide-react";
import Image from "next/image";
import { useProductDetail } from "@/api/handlers/productDetailsHandler";
import { useAddToWishlist } from "@/api/handlers/wishlistHandler";
import { useAddToCart } from "@/api/handlers/cartHandler";
import { useProductFAQs } from "@/api/handlers/faqHandler";
import { useAppStore } from "@/store/use-app-store";
import QuoteFormModal from "@/components/quote-form-modal";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ProductVariants from "@/components/ProductVariants";
import { useProductVariants } from "@/api/handlers/productVariantsHandler";
import CompanyDocumentsSection from "@/components/CompanyDocumentsSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: variantsResponse } = useProductVariants(productId);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const currentUrl = `${baseUrl}${pathname}${searchParams}`;

  const { customer, isAuthenticated } = useAppStore();

  const { data: response, isLoading, error, isError } = useProductDetail(productId);
  const addToWishlistMutation = useAddToWishlist();

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const addToCartMutation = useAddToCart();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productData = (response as any)?.data;
  const faqProductId = productData?.uniqueId || "";
  const { data: faqResponse } = useProductFAQs(faqProductId, { enabled: !!faqProductId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faqs = (faqResponse as any)?.data || [];

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [minCartQuantity, setMinCartQuantity] = useState(1);
  const [cartQuantity, setCartQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isMagnified, setIsMagnified] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });

  const [companySpecific, setCompanySpecific] = useState("Documents - Company Specific");
  const [facilitySpecific, setFacilitySpecific] = useState("Documents - Facility Specific");
  const [productSpecific, setProductSpecific] = useState("Documents - Product Specific");
  const [batchSpecific, setBatchSpecific] = useState("Documents - Batch Specific");

  useEffect(() => {
    if (variantsResponse?.data?.length) {
      const minUnitSize = Math.min(...variantsResponse.data.map((v) => v.unitSize));
      setMinCartQuantity(minUnitSize);
      setCartQuantity(minUnitSize);
    }
  }, [variantsResponse]);

  useEffect(() => {
    if (snackbarOpen) {
      const timer = setTimeout(() => setSnackbarOpen(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [snackbarOpen]);

  const handlePlaceEnquiry = () => setIsQuoteModalOpen(true);

  const handleWishlistClick = () => {
    if (!isAuthenticated || !customer) { router.push("/sign_in"); return; }
    addToWishlistMutation.mutate(
      { customerId: customer.id, productId },
      {
        onSuccess: () => { setSnackbarMessage("Product added to wishlist successfully!"); setSnackbarOpen(true); },
        onError: () => { setSnackbarMessage("Failed to add product to wishlist. Please try again."); setSnackbarOpen(true); },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          Error loading product details: {error instanceof Error ? error.message : "Something went wrong"}
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product: any = productData ?? {};

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700">Product not found</div>
      </div>
    );
  }

  const getProductImages = () => {
    const images = [];
    if (product.bannerImage) {
      images.push({
        src: product.bannerImage.startsWith("http") ? product.bannerImage : `${process.env.NEXT_PUBLIC_API_URL}/${product.bannerImage}`,
        alt: `${product.name} - Banner`,
        type: "banner",
      });
    }
    if (product.images?.length > 0) {
      product.images.forEach((image: string, index: number) => {
        images.push({
          src: image.startsWith("http") ? image : `${process.env.NEXT_PUBLIC_API_URL}/${image}`,
          alt: `${product.name} - Image ${index + 1}`,
          type: "gallery",
        });
      });
    }
    if (images.length === 0) {
      images.push({ src: "/placeholder.svg?height=400&width=600", alt: "Product placeholder", type: "placeholder" });
    }
    return images;
  };

  const getCurrentImage = () => {
    const images = getProductImages();
    return images[selectedImageIndex] || images[0];
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMagnified) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setMagnifierPosition({ x, y });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = (product?.dietaryAttributes as any[])?.map((attr: { title: string; logo?: string; certificateLink?: string }) => ({
      label: attr.title,
      color: "var(--color-brand)",
      logo: attr.logo,
      certificateLink: attr.certificateLink,
    })) || [];

  const handleWhatsAppShare = (prod: { name: string }) => {
    const message = `To checkout ${prod.name} on EZRM, please click on the below link:\n${currentUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleEmailShare = (prod: { name: string }) => {
    const subject = "Check out product on EZRM!";
    const body = `Hi,\n\nTo checkout ${prod.name} on EZRM, please click on the below link:\n${currentUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const specifications: Record<string, string> = {};
  if (product.appearance) specifications["Appearance"] = product.appearance;
  if (product.category?.name) specifications["Category"] = product.category.name;
  if (product.uniqueId) specifications["Product ID"] = product.uniqueId;

  return (
    <div className="min-h-screen bg-background">
      <div className="py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <p className="mb-6 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-primary" onClick={() => router.push("/product")}>Products</span>
            {" / "}
            <span className="font-medium text-foreground">{product.name}</span>
          </p>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column */}
            <div className="space-y-6 lg:space-y-8">
              {/* Product Name & Short Intro */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 lg:mb-4 text-primary">{product.name}</h1>
                <p className="text-base lg:text-lg text-muted-foreground">{product.uniqueId && `Product Code: ${product.uniqueId}`}</p>
                {product.moq && (
                  <div className="mt-3 inline-block">
                    <span className="text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
                      MOQ: {product.moq}
                    </span>
                  </div>
                )}
              </div>

              {/* Product Image */}
              <Card className="overflow-hidden">
                <div
                  className="relative aspect-square"
                  style={{ cursor: isMagnified ? "zoom-out" : "zoom-in" }}
                  onMouseEnter={() => setIsMagnified(true)}
                  onMouseLeave={() => setIsMagnified(false)}
                  onMouseMove={handleMouseMove}
                >
                  <Image
                    src={getCurrentImage().src}
                    alt={getCurrentImage().alt}
                    fill
                    className="object-cover"
                  />
                  {isMagnified && (
                    <div
                      className="absolute inset-0 pointer-events-none z-[2]"
                      style={{
                        background: `url(${getCurrentImage().src})`,
                        backgroundSize: "300%",
                        backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
                      }}
                    />
                  )}
                </div>
              </Card>

              {/* Thumbnail Gallery */}
              {getProductImages().length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {getProductImages().map((image, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square overflow-hidden rounded-md cursor-pointer transition-all duration-300 ${
                        selectedImageIndex === index ? "ring-2 ring-primary" : "ring-1 ring-border hover:ring-primary/50"
                      }`}
                    >
                      <Image src={image.src} alt={image.alt} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button size="lg" className="flex-1 gap-2" onClick={handlePlaceEnquiry}>
                  <Send className="h-5 w-5" />
                  Send Enquiries
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleWishlistClick}
                  disabled={addToWishlistMutation.isPending}
                >
                  <Heart className="h-5 w-5" />
                  Add to Wishlist
                </Button>
              </div>

              {/* Social Sharing */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Share:</span>
                <button onClick={() => handleWhatsAppShare(product)} className="p-1.5 text-[#25d366] hover:opacity-80 transition-opacity">
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button onClick={() => handleEmailShare(product)} className="p-1.5 text-[#ea4335] hover:opacity-80 transition-opacity">
                  <Mail className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-primary hover:opacity-80 transition-opacity">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Specifications */}
              {Object.keys(specifications).length > 0 && (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Specifications</h2>
                  <div className="space-y-2 sm:space-y-3">
                    {Object.entries(specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b border-border pb-2 text-sm sm:text-base">
                        <span className="font-medium capitalize">{key}</span>
                        <span className="text-muted-foreground text-right ml-2">{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-b border-border pb-2 text-sm sm:text-base">
                      <span className="font-medium">Stock Status</span>
                      <span className={`text-right ml-2 font-medium ${product.inStock ? "text-green-600" : "text-red-500"}`}>
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Dietary Attributes / Certifications */}
              {features.length > 0 && (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Certifications & Attributes</h2>
                  <div className="flex flex-wrap gap-4">
                    {features.map((feature: { label: string; logo?: string; certificateLink?: string }, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg border border-primary/10 bg-primary/5 min-w-[200px] flex-1"
                        style={{ cursor: feature.certificateLink ? "pointer" : "default" }}
                        onClick={() => feature.certificateLink && window.open(feature.certificateLink, "_blank")}
                      >
                        {feature.logo && (
                          <Image src={feature.logo} alt={feature.label} width={32} height={32} className="object-contain rounded" />
                        )}
                        <div>
                          <p className="font-semibold text-sm">{feature.label}</p>
                          {feature.certificateLink && <p className="text-primary text-[10px]">Click to view certificate</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6 lg:space-y-8">
              {/* Description */}
              {product.description && (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Description</h2>
                  <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line">{product.description}</p>
                </Card>
              )}

              {/* Applications & Functions & Tags */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Product Details</h2>
                <div className="space-y-4">
                  {product.applications?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Applications</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.applications.map((app: string, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {app.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.functions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Functions</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.functions.map((func: string, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {func.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.tags?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {tag.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.countryOfOrigin?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Countries of Origin</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.countryOfOrigin.map((country: string, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {country}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Product Variants */}
              <ProductVariants productId={productId} />

              {/* Quantity & Cart */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Order</h2>
                <div className="mb-4">
                  <p className="font-semibold text-sm mb-2">Quantity</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCartQuantity(Math.max(minCartQuantity, cartQuantity - minCartQuantity))}
                      disabled={cartQuantity <= minCartQuantity}
                      className="w-8 h-8 flex items-center justify-center border border-border rounded disabled:opacity-50 hover:border-primary transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={cartQuantity}
                      min={minCartQuantity}
                      step={minCartQuantity}
                      onChange={(e) => {
                        let value = parseInt(e.target.value) || minCartQuantity;
                        if (value < minCartQuantity) value = minCartQuantity;
                        else value = Math.ceil(value / minCartQuantity) * minCartQuantity;
                        setCartQuantity(value);
                      }}
                      className="w-16 h-8 text-center text-sm border border-border rounded outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => setCartQuantity(cartQuantity + minCartQuantity)}
                      className="w-8 h-8 flex items-center justify-center border border-border rounded hover:border-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      if (!isAuthenticated || !customer) { router.push("/sign_in"); return; }
                      addToCartMutation.mutate(
                        { customerId: customer.id, productId, quantity: cartQuantity },
                        {
                          onSuccess: () => { setSnackbarMessage("Added to cart successfully!"); setSnackbarOpen(true); },
                          onError: () => { setSnackbarMessage("Failed to add product to cart."); setSnackbarOpen(true); },
                        }
                      );
                    }}
                    disabled={!product.inStock || minCartQuantity <= 1}
                    className="w-full gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {product.inStock ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </div>
              </Card>

              {/* FAQs */}
              {faqs.length > 0 && (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">FAQs</h2>
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq: { question: string; answer: string }, idx: number) => (
                      <AccordionItem key={idx} value={`faq-${idx}`}>
                        <AccordionTrigger className="text-sm sm:text-base">{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-sm sm:text-base">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Card>
              )}
            </div>
          </div>

          {/* Full Width: Company Documents */}
          <div className="mt-12 lg:mt-16">
            <CompanyDocumentsSection
              companySpecific={companySpecific}
              facilitySpecific={facilitySpecific}
              productSpecific={productSpecific}
              batchSpecific={batchSpecific}
              onCompanySpecificChange={setCompanySpecific}
              onFacilitySpecificChange={setFacilitySpecific}
              onProductSpecificChange={setProductSpecific}
              onBatchSpecificChange={setBatchSpecific}
            />
          </div>
        </div>
      </div>

      {/* Quote Form Modal */}
      <QuoteFormModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        productName={product.name}
        productId={product._id}
      />

      {/* Snackbar Toast */}
      {snackbarOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#323232] text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium">
          {snackbarMessage}
        </div>
      )}
    </div>
  );
}


