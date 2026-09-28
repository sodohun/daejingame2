/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PoolGame } from './components/PoolGame';

export default function App() {
  return (
    <main className="w-screen h-screen bg-black overflow-hidden select-none">
      <PoolGame />
    </main>
  );
}
