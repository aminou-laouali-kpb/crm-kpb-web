import { z } from 'zod';

// Phone number regex - validates international format
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Invoice validation schema
export const invoiceSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1, "Le prénom est requis")
    .max(100, "Le prénom ne peut pas dépasser 100 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le prénom contient des caractères invalides"),
  
  lastName: z.string()
    .trim()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom contient des caractères invalides"),
  
  email: z.string()
    .trim()
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères")
    .toLowerCase(),
  
  whatsapp: z.string()
    .trim()
    .regex(phoneRegex, "Numéro WhatsApp invalide (format: +33612345678)"),
  
  service: z.string()
    .trim()
    .min(1, "La description du service est requise")
    .max(1000, "La description ne peut pas dépasser 1000 caractères"),
  
  amount: z.number()
    .positive("Le montant doit être positif")
    .min(0.01, "Le montant minimum est 0.01")
    .max(999999999, "Le montant maximum est 999,999,999")
    .finite("Le montant doit être un nombre valide"),
  
  invoiceNumber: z.string()
    .trim()
    .min(1, "Le numéro de facture est requis")
    .max(50, "Le numéro de facture ne peut pas dépasser 50 caractères"),
  
  invoiceDate: z.string()
    .trim()
    .min(1, "La date de facture est requise")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)")
});

// Validation helper function with user-friendly error messages
export const validateInvoiceData = (data) => {
  try {
    const normalized = {
      ...data,
      // Commercials often type spaces / dashes in phone numbers
      whatsapp: String(data?.whatsapp || '').trim().replace(/[\s().-]/g, ''),
      amount: typeof data?.amount === 'number'
        ? data.amount
        : Number.parseFloat(String(data?.amount ?? '').replace(',', '.')),
    };
    const validated = invoiceSchema.parse(normalized);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { 
        success: false, 
        error: firstError.message 
      };
    }
    return { 
      success: false, 
      error: "Erreur de validation" 
    };
  }
};

// Sanitize text input to prevent XSS
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  
  // Remove any HTML tags and script content
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};
