import React from 'react'
import './CustomButton.css'

type CustomButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export default function CustomButton({ children, ...rest }: CustomButtonProps) {
  return (
    <button {...rest}>
      {children}
    </button>
  )
}
