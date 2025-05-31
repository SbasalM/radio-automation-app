import * as React from "react"
import { cn } from "@/utils/cn"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export interface SelectTriggerProps
  extends React.HTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

export interface SelectValueProps {
  placeholder?: string
}

export interface SelectContentProps {
  children: React.ReactNode
}

export interface SelectItemProps {
  value: string
  children: React.ReactNode
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      {children}
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLSelectElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { value, onValueChange } = React.useContext(SelectContext)
    
    // Extract SelectContent to get the options
    const selectContent = React.Children.toArray(children).find(
      child => React.isValidElement(child) && child.type === SelectContent
    )
    
    let options: { value: string; children: React.ReactNode }[] = []
    if (React.isValidElement(selectContent)) {
      options = React.Children.map(selectContent.props.children, (child) => {
        if (React.isValidElement(child) && child.props.value) {
          return { value: child.props.value, children: child.props.children }
        }
        return null
      }).filter(Boolean)
    }
    
    return (
      <select
        ref={ref}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:ring-offset-gray-900 dark:placeholder:text-gray-400 dark:focus:ring-blue-400",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.children}
          </option>
        ))}
      </select>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue: React.FC<SelectValueProps> = () => {
  return null // Not needed with native select
}

const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  return <>{children}</> // Just a container for SelectItems
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  return null // Handled by SelectTrigger
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} 