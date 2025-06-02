'use client'
import * as React from 'react'
import { Toaster, toast } from 'sonner'

export function ToasterProvider() {
  return <Toaster position="top-right" />
}

export function useToast() {
  return toast
}
