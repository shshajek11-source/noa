'use client'

import React from 'react'

interface Column<T> {
    key: string
    title: string
    render?: (item: T) => React.ReactNode
    width?: string
    align?: 'left' | 'center' | 'right'
}

interface DSTableProps<T> {
    data: T[]
    columns: Column<T>[]
    isLoading?: boolean
    emptyMessage?: string
    onRowClick?: (item: T) => void
    maxHeight?: string
}

export default function DSTable<T extends { id?: string | number } & Record<string, any>>({
    data,
    columns,
    isLoading = false,
    emptyMessage = 'No data available',
    onRowClick,
    maxHeight
}: DSTableProps<T>) {

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading...
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div style={{
                padding: '3rem',
                textAlign: 'center',
                background: '#111318',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)'
            }}>
                {emptyMessage}
            </div>
        )
    }

    return (
        <div style={{
            overflowX: 'auto',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: '#111318',
            maxHeight: maxHeight,
            overflowY: maxHeight ? 'auto' : 'visible'
        }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ background: '#1F2937', color: 'var(--text-secondary)' }}>
                        {columns.map((col) => (
                            <th key={col.key} style={{
                                textAlign: col.align || 'left',
                                padding: '0.75rem 1rem',
                                borderBottom: '1px solid var(--border)',
                                fontWeight: 600,
                                width: col.width
                            }}>
                                {col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr
                            key={row.id || idx}
                            onClick={() => onRowClick?.(row)}
                            style={{
                                cursor: onRowClick ? 'pointer' : 'default',
                                transition: 'background 0.1s'
                            }}
                            className="ds-table-row"
                        >
                            {columns.map((col) => (
                                <td key={`${col.key}-${idx}`} style={{
                                    textAlign: col.align || 'left',
                                    padding: '0.75rem 1rem',
                                    borderBottom: idx !== data.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    color: 'var(--brand-white)'
                                }}>
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <style jsx>{`
                .ds-table-row:hover {
                    background: rgba(217, 43, 75, 0.05); /* Very subtle red tint */
                }
            `}</style>
        </div>
    )
}
