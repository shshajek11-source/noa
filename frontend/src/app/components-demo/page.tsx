'use client'

import React, { useState } from 'react'
import DSButton from '../components/design-system/DSButton'
import DSCard from '../components/design-system/DSCard'
import DSInput from '../components/design-system/DSInput'
import DSSearchBar from '../components/design-system/DSSearchBar'
import DSBadge from '../components/design-system/DSBadge'
import DSTabs from '../components/design-system/DSTabs'
import DSTable from '../components/design-system/DSTable'

export default function ComponentsDemoPage() {
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="container" style={{ padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--brand-white)' }}>
        <span style={{ color: 'var(--brand-red-main)' }}>Design System</span> Reference
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        Centralized components based on the new brand identity.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        {/* 1. Buttons */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            1. Buttons
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <DSButton>Primary Action</DSButton>
            <DSButton variant="secondary">Secondary Action</DSButton>
            <DSButton variant="ghost">Ghost Button</DSButton>
            <DSButton variant="danger">Danger Zone</DSButton>
            <div style={{ width: '1px', height: '30px', background: '#374151', margin: '0 1rem' }}></div>
            <DSButton size="sm">Small</DSButton>
            <DSButton size="lg">Large Button</DSButton>
            <DSButton disabled>Disabled</DSButton>
          </div>
        </section>

        {/* 2. Inputs */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            2. Inputs
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <DSCard title="Input Variants">
              <DSInput
                label="Character Name"
                placeholder="Enter name..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <DSInput
                label="Search"
                placeholder="Search everything..."
                icon={<span>🔍</span>}
              />
              <DSInput
                label="Error State"
                placeholder="Invalid input"
                error="This field is required"
              />
            </DSCard>

            <DSCard title="Search Component" noPadding>
              <div style={{ padding: '2rem' }}>
                <h5 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Standard Gradient Search</h5>
                <DSSearchBar placeholder="Search for characters..." />

                <h5 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Small Wrapper</h5>
                <div style={{ width: '300px' }}>
                  <DSSearchBar placeholder="Compact search..." />
                </div>
              </div>
            </DSCard>

          </div>
        </section>

        {/* 3. Cards & Structure */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            3. Cards & Structure
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <DSCard title="Standard Card" action={<DSButton size="sm" variant="ghost">More</DSButton>}>
              <p style={{ color: 'var(--text-secondary)' }}>
                This is a standard card component with a title, action button area, and content padding.
                It uses the brand's dark background and subtle borders.
              </p>
            </DSCard>

            <DSCard title="Hover Effect" hoverEffect={true}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--brand-red-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🚀</div>
                <h4 style={{ margin: 0 }}>Interactive Card</h4>
                <p style={{ fontSize: '0.9rem', color: '#9CA3AF' }}>Hover over this card to see the interaction effect designed for clickable items.</p>
              </div>
            </DSCard>

            <DSCard noPadding>
              <div style={{ padding: '1.5rem', background: 'linear-gradient(45deg, var(--brand-red-main), var(--brand-red-dark))' }}>
                <h3 style={{ color: 'white', margin: 0 }}>No Padding Mode</h3>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Useful for cards that need full-bleed images or custom headers.
                </p>
              </div>
            </DSCard>
          </div>
        </section>

        {/* 4. Badges */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            4. Badges & Tags
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <DSBadge variant="primary">New Badge</DSBadge>
            <DSBadge variant="outline">Outline</DSBadge>
            <DSBadge variant="dark">Dark Tag</DSBadge>
            <DSBadge variant="success">Active</DSBadge>
            <DSBadge variant="warning">Pending</DSBadge>
          </div>
        </section>

        {/* 6. Navigation (Tabs) */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            6. Navigation
          </h2>
          <DSCard title="Tabs Component">
            <DSTabs
              tabs={[
                { id: 'overview', label: 'Overview', content: <div style={{ padding: '1rem' }}>Overview Content Area</div> },
                { id: 'stats', label: 'Statistics', content: <div style={{ padding: '1rem' }}>Stats Charts & Graphs</div> },
                { id: 'history', label: 'Match History', content: <div style={{ padding: '1rem' }}>Recent matches list...</div> },
                { id: 'settings', label: 'Settings', disabled: true }
              ]}
            />
            <div style={{ marginTop: '2rem' }}>
              <DSTabs
                variant="pill"
                tabs={[
                  { id: 'daily', label: 'Daily', content: <div>Daily Stats</div> },
                  { id: 'weekly', label: 'Weekly', content: <div>Weekly Stats</div> },
                  { id: 'monthly', label: 'Monthly', content: <div>Monthly Stats</div> }
                ]}
              />
            </div>
          </DSCard>
        </section>

        {/* 7. Data Display (Table) */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            7. Data Table
          </h2>
          <DSTable
            columns={[
              { key: 'rank', title: '#', width: '50px', align: 'center' },
              { key: 'name', title: 'Player' },
              { key: 'class', title: 'Class', render: (row) => <DSBadge size="sm" variant="dark">{row.class}</DSBadge> },
              { key: 'points', title: 'Points', align: 'right', render: (row) => <span style={{ color: 'var(--brand-red-main)', fontWeight: 'bold' }}>{row.points.toLocaleString()}</span> }
            ]}
            data={[
              { id: 1, rank: 1, name: 'SlayerGod', class: 'Gladiator', points: 15420 },
              { id: 2, rank: 2, name: 'HealBot', class: 'Cleric', points: 14200 },
              { id: 3, rank: 3, name: 'ShadowStep', class: 'Assassin', points: 13850 },
            ]}
          />
        </section>

        {/* 8. Interactive (Modal) */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            8. Interactive
          </h2>
          <DSButton onClick={() => alert('Modal demo would open here')}>Open Demo Modal</DSButton>
        </section>

        {/* 5. Colors Reference */}
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            5. Color Palette
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
            {[
              { name: 'Red Main', var: 'var(--brand-red-main)' },
              { name: 'Red Dark', var: 'var(--brand-red-dark)' },
              { name: 'Red Muted', var: 'var(--brand-red-muted)' },
              { name: 'Black', var: 'var(--brand-black)' },
              { name: 'White', var: 'var(--brand-white)' },
            ].map((c) => (
              <div key={c.name} style={{ textAlign: 'center' }}>
                <div style={{
                  height: '80px',
                  background: c.var,
                  borderRadius: '8px',
                  border: '1px solid #374151',
                  marginBottom: '0.5rem'
                }}></div>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{c.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{c.var}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
