import Image from 'next/image';

export default function ImpactGallery() {
  return (
    <section className="py-16 px-6 bg-slate-900/50 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Our Impact in Action</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            See how your support directly reaches vulnerable communities, families, and youth across Nigeria through our outreach programs.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Item 1 */}
          <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
            <div className="relative h-64 w-full">
              <Image 
                src="/impact-1.jpg" 
                alt="HMSI Community Food Distribution Drive" 
                fill 
                className="object-cover hover:scale-105 transition duration-300"
              />
            </div>
            <div className="p-5">
              <h3 className="text-white font-semibold text-lg mb-1">Community Support Drives</h3>
              <p className="text-slate-400 text-sm">Providing essential food items and resources directly to families in need.</p>
            </div>
          </div>

          {/* Item 2 */}
          <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
            <div className="relative h-64 w-full">
              <Image 
                src="/impact-2.jpg" 
                alt="HMSI Volunteers and Security Team" 
                fill 
                className="object-cover hover:scale-105 transition duration-300"
              />
            </div>
            <div className="p-5">
              <h3 className="text-white font-semibold text-lg mb-1">Dedicated Volunteer Teams</h3>
              <p className="text-slate-400 text-sm">Working hand-in-hand with local security and personnel to ensure safe outreach operations.</p>
            </div>
          </div>

          {/* Item 3 */}
          <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
            <div className="relative h-64 w-full">
              <Image 
                src="/impact-3.jpg" 
                alt="Empowering Vulnerable Groups" 
                fill 
                className="object-cover hover:scale-105 transition duration-300"
              />
            </div>
            <div className="p-5">
              <h3 className="text-white font-semibold text-lg mb-1">Restoring Hope</h3>
              <p className="text-slate-400 text-sm">Creating sustainable impact and building trust face-to-face within our communities.</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
