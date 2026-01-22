import { z } from 'zod';

// Expense validation schema
export const expenseSchema = z.object({
  description: z.string()
    .trim()
    .min(1, "La description est requise")
    .max(1000, "La description ne peut pas dépasser 1000 caractères"),
  
  amount: z.number()
    .positive("Le montant doit être positif")
    .min(0.01, "Le montant minimum est 0.01")
    .max(999999999, "Le montant maximum est 999,999,999")
    .finite("Le montant doit être un nombre valide"),
  
  expense_date: z.string()
    .trim()
    .min(1, "La date est requise")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  
  category_id: z.string().uuid().nullable().optional(),
  
  status: z.enum(['pending', 'paid'], {
    errorMap: () => ({ message: "Statut invalide" })
  }),
  
  payment_method: z.string()
    .trim()
    .max(100, "Le mode de paiement ne peut pas dépasser 100 caractères")
    .optional()
    .nullable(),
  
  notes: z.string()
    .trim()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .optional()
    .nullable()
});

// Planned income validation schema
export const plannedIncomeSchema = z.object({
  description: z.string()
    .trim()
    .min(1, "La description est requise")
    .max(1000, "La description ne peut pas dépasser 1000 caractères"),
  
  amount: z.number()
    .positive("Le montant doit être positif")
    .min(0.01, "Le montant minimum est 0.01")
    .max(999999999, "Le montant maximum est 999,999,999")
    .finite("Le montant doit être un nombre valide"),
  
  due_date: z.string()
    .trim()
    .min(1, "La date d'échéance est requise")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  
  status: z.enum(['pending', 'received', 'overdue'], {
    errorMap: () => ({ message: "Statut invalide" })
  }),
  
  source: z.string()
    .trim()
    .max(200, "La source ne peut pas dépasser 200 caractères")
    .optional()
    .nullable(),
  
  is_recurring: z.boolean().optional(),
  
  recurrence_type: z.enum(['monthly', 'quarterly', 'yearly']).nullable().optional(),
  
  notes: z.string()
    .trim()
    .max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
    .optional()
    .nullable()
});

// Budget validation schema
export const budgetSchema = z.object({
  category_id: z.string()
    .uuid("ID de catégorie invalide")
    .min(1, "La catégorie est requise"),
  
  budgeted_amount: z.number()
    .min(0, "Le montant budgété doit être positif ou zéro")
    .max(999999999, "Le montant maximum est 999,999,999")
    .finite("Le montant doit être un nombre valide")
});

// Validation helper function with user-friendly error messages
export const validateAccountingData = (schema, data) => {
  try {
    const validated = schema.parse(data);
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
