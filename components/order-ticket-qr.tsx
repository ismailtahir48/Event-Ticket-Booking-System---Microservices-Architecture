'use client'

import dynamic from 'next/dynamic'

const QRCodeSVG = dynamic(() => import('qrcode.react').then((mod) => mod.QRCodeSVG), {
  ssr: false,
})

interface OrderTicketQRProps {
  orderId: string
  itemId: string
  seatId: string
}

export function OrderTicketQR({ orderId, itemId, seatId }: OrderTicketQRProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 pt-4 border-t">
      <p className="text-xs text-muted-foreground">Ticket QR Code</p>
      <QRCodeSVG 
        value={`ticket:${orderId}:${itemId}:${seatId}`} 
        size={128}
        level="M"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Show this QR code at the venue
      </p>
    </div>
  )
}

