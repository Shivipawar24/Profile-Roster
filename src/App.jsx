import React from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AnalyzerCard from './components/AnalyzerCard'
import Features from './components/Features'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main>
        <Hero />
        <AnalyzerCard />
        <Features />
      </main>
      <Footer />
    </div>
  )
}
