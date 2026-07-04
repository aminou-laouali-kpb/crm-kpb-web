import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWhatsAppLink } from '@/utils/whatsappUtils';

const WhatsAppLink = ({ phone, message, variant = 'ghost', size = 'sm', label = 'WhatsApp' }) => {
  if (!phone) return null;

  const href = buildWhatsAppLink(phone, message);

  return (
    <Button
      variant={variant}
      size={size}
      asChild
      className="text-green-600 hover:text-green-700 hover:bg-green-50"
    >
      <a href={href} target="_blank" rel="noopener noreferrer" title={label}>
        <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
        {label && label !== 'WhatsApp' && (
          <span className="ml-1 hidden sm:inline">{label}</span>
        )}
      </a>
    </Button>
  );
};

export default WhatsAppLink;
