import { useQuery } from "@tanstack/react-query";
import { faqService } from "../services/faqs";

export const useProductFAQs = (productId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["product-faqs", productId],
    queryFn: () => faqService.getProductFAQs(productId),
    enabled: options?.enabled !== undefined ? options.enabled : !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
