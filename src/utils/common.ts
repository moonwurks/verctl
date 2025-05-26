export interface PackageJson {
	version?: string;
	[key: string]: unknown;
}

export interface PackageLockJson {
	version?: string;
	packages?: {
		[key: string]: {
			version?: string;
			[key: string]: unknown;
		};
	};
}

export function getRootPackage(lock: PackageLockJson): { version?: string } | undefined {
	return lock.packages && Object.prototype.hasOwnProperty.call(lock.packages, '') ? lock.packages[''] : undefined
}
