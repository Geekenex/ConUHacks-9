import React from 'react'
import './CustomInput.css'

type CustomInputProps = React.InputHTMLAttributes<HTMLInputElement>

export default function CustomInput(props: CustomInputProps) {
  return <input {...props} />
}
