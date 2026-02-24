"use client"

import * as React from "react"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface BlogCalendarProps {
  postDates: { date: string; count: number }[]
}

export function BlogCalendar({ postDates }: BlogCalendarProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const router = useRouter()

  // Convert the postDates array into a map for easier lookup
  const postCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    postDates.forEach((pd) => {
      counts.set(pd.date, pd.count)
    })
    return counts
  }, [postDates])

  // Create an array of Date objects for the calendar modifiers
  const datesWithPosts = React.useMemo(() => {
    return postDates.map((pd) => new Date(pd.date))
  }, [postDates])

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      // Format date to YYYY-MM-DD
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}`
      
      router.push(`/?date=${formattedDate}`)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={handleSelect}
        className="rounded-md border shadow"
        modifiers={{ hasPost: datesWithPosts }}
        modifiersClassNames={{
          hasPost: "font-bold text-primary",
        }}
        components={{
          DayButton: (props) => {
            const { day, modifiers, ...rest } = props;
            const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`
            const count = postCounts.get(dateStr)

            return (
              <CalendarDayButton day={day} modifiers={modifiers} {...rest}>
                <div className="relative flex h-full w-full items-center justify-center">
                  <span>{day.date.getDate()}</span>
                  {count && count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -bottom-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
                    >
                      {count}
                    </Badge>
                  )}
                </div>
              </CalendarDayButton>
            )
          },
        }}
      />
    </div>
  )
}
