/**
 * Address Converter Module Widget
 *
 * Dashboard widget wrapper for the Address Converter utility
 */

import { AddressConverter } from '../../components/AddressConverter'

export function AddressConverterWidget() {
  return (
    <div className="h-full bg-white rounded-2xl border border-[#e7e5e4] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="h-full overflow-auto">
        <AddressConverter />
      </div>
    </div>
  )
}
