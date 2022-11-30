import Image from 'next/image'

export default function Logo() {
  return (
    <div className="h-0 flex flex-row items-center align-middle mr-3 self-center">
      <Image 
        width={400}
        height={200} 
        src="https://i.sonder.io/sonder-full-logo-horizontal.png"
        alt="Sonder Logo"
        />
    </div>
  );
}
