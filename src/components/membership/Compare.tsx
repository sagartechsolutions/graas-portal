import Icon from "@/components/ui/Icon";
import { MATRIX } from "@/lib/benefits";

const COLS = ["School Student", "Student", "Professional", "Institution", "Industry"];

/** Every benefit side by side. */
export default function Compare({ prices }: { prices: string[] }) {
  return (
    <div className="overflow-x-auto rounded-[24px] border border-line bg-white">
      <table className="w-full min-w-[760px] border-collapse text-[0.95rem]">
        <thead>
          <tr className="bg-mist">
            <th scope="col" className="sticky left-0 z-10 bg-mist p-4 text-left font-semibold">What you get</th>
            {COLS.map((c, i) => (
              <th key={c} scope="col" className="p-4 text-center align-bottom">
                <span aria-hidden="true" className="mx-auto mb-2 flex h-6 w-2.5 items-end">
                  <span className="block w-2.5 rounded-t-[2px]" style={{ height: 6 + i * 4.5, background: ["#d4d6da", "#b7babf", "#8e919a", "#5a616b", "#000e21"][i] }} />
                </span>
                <span className="block font-semibold">{c}</span>
                <span className="readout block text-sm font-normal text-ink2">{prices[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX.map((row) => (
            <tr key={row.label} className="border-t border-line transition-colors hover:bg-mist/60">
              <th scope="row" className="sticky left-0 bg-white p-4 text-left font-medium">{row.label}</th>
              {row.cells.map((c, i) => (
                <td key={i} className="p-4 text-center">
                  {c === true ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-go-soft text-go-deep" aria-label="Included">
                      <Icon name="check" size={16} strokeWidth={2.6} />
                    </span>
                  ) : c === false ? (
                    <span className="text-slate3" aria-label="Not included">—</span>
                  ) : (
                    <span className="text-sm font-medium text-ink2">{c}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
