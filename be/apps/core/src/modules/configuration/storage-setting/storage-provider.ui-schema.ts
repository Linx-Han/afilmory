import type { UiSchemaTFunction } from '../../ui/ui-schema/ui-schema.i18n'

export type StorageProviderType = 's3' | 'oss' | 'cos' | 'github' | 'b2'

export interface StorageProviderFieldSchema {
  key: string
  label: string
  description?: string | null
  placeholder?: string | null
  helperText?: string | null
  multiline?: boolean
  sensitive?: boolean
  required?: boolean
}

export interface StorageProviderFormSchema {
  types: ReadonlyArray<{ value: StorageProviderType; label: string }>
  fields: Record<StorageProviderType, readonly StorageProviderFieldSchema[]>
}

const STORAGE_PROVIDER_TYPES: readonly StorageProviderType[] = ['s3', 'oss', 'cos', 'github', 'b2']

type StorageProviderFieldConfig = {
  key: string
  labelKey: string
  placeholderKey?: string
  descriptionKey?: string
  helperKey?: string
  multiline?: boolean
  sensitive?: boolean
  required?: boolean
}

const S3_FIELD_CONFIG: readonly StorageProviderFieldConfig[] = [
  {
    key: 'bucket',
    labelKey: 'storage.providers.fields.s3.bucket.label',
    placeholderKey: 'storage.providers.fields.s3.bucket.placeholder',
    descriptionKey: 'storage.providers.fields.s3.bucket.description',
    required: true,
  },
  {
    key: 'region',
    labelKey: 'storage.providers.fields.s3.region.label',
    placeholderKey: 'storage.providers.fields.s3.region.placeholder',
    descriptionKey: 'storage.providers.fields.s3.region.description',
    required: true,
  },
  {
    key: 'endpoint',
    labelKey: 'storage.providers.fields.s3.endpoint.label',
    placeholderKey: 'storage.providers.fields.s3.endpoint.placeholder',
    descriptionKey: 'storage.providers.fields.s3.endpoint.description',
    helperKey: 'storage.providers.fields.s3.endpoint.helper',
    required: true,
  },
  {
    key: 'accessKeyId',
    labelKey: 'storage.providers.fields.s3.access-key.label',
    placeholderKey: 'storage.providers.fields.s3.access-key.placeholder',
    required: true,
  },
  {
    key: 'secretAccessKey',
    labelKey: 'storage.providers.fields.s3.secret-key.label',
    placeholderKey: 'storage.providers.fields.s3.secret-key.placeholder',
    sensitive: true,
    required: true,
  },
  {
    key: 'prefix',
    labelKey: 'storage.providers.fields.s3.prefix.label',
    placeholderKey: 'storage.providers.fields.s3.prefix.placeholder',
    descriptionKey: 'storage.providers.fields.s3.prefix.description',
  },
  {
    key: 'customDomain',
    labelKey: 'storage.providers.fields.s3.custom-domain.label',
    placeholderKey: 'storage.providers.fields.s3.custom-domain.placeholder',
    descriptionKey: 'storage.providers.fields.s3.custom-domain.description',
  },
  {
    key: 'excludeRegex',
    labelKey: 'storage.providers.fields.s3.exclude-regex.label',
    placeholderKey: 'storage.providers.fields.s3.exclude-regex.placeholder',
    descriptionKey: 'storage.providers.fields.s3.exclude-regex.description',
    helperKey: 'storage.providers.fields.s3.exclude-regex.helper',
    multiline: true,
  },
  // {
  //   key: 'maxFileLimit',
  //   labelKey: 'storage.providers.fields.s3.max-files.label',
  //   placeholderKey: 'storage.providers.fields.s3.max-files.placeholder',
  //   descriptionKey: 'storage.providers.fields.s3.max-files.description',
  // },
]

const STORAGE_PROVIDER_FIELD_CONFIG: Record<StorageProviderType, readonly StorageProviderFieldConfig[]> = {
  s3: S3_FIELD_CONFIG,
  oss: S3_FIELD_CONFIG,
  cos: S3_FIELD_CONFIG,
  github: [
    {
      key: 'owner',
      labelKey: 'storage.providers.fields.github.owner.label',
      placeholderKey: 'storage.providers.fields.github.owner.placeholder',
      descriptionKey: 'storage.providers.fields.github.owner.description',
      required: true,
    },
    {
      key: 'repo',
      labelKey: 'storage.providers.fields.github.repo.label',
      placeholderKey: 'storage.providers.fields.github.repo.placeholder',
      descriptionKey: 'storage.providers.fields.github.repo.description',
      required: true,
    },
    {
      key: 'branch',
      labelKey: 'storage.providers.fields.github.branch.label',
      placeholderKey: 'storage.providers.fields.github.branch.placeholder',
      descriptionKey: 'storage.providers.fields.github.branch.description',
      helperKey: 'storage.providers.fields.github.branch.helper',
    },
    {
      key: 'token',
      labelKey: 'storage.providers.fields.github.token.label',
      placeholderKey: 'storage.providers.fields.github.token.placeholder',
      descriptionKey: 'storage.providers.fields.github.token.description',
      sensitive: true,
      required: true,
    },
    {
      key: 'path',
      labelKey: 'storage.providers.fields.github.path.label',
      placeholderKey: 'storage.providers.fields.github.path.placeholder',
      descriptionKey: 'storage.providers.fields.github.path.description',
    },
    {
      key: 'customDomain',
      labelKey: 'storage.providers.fields.github.custom-domain.label',
      placeholderKey: 'storage.providers.fields.github.custom-domain.placeholder',
      descriptionKey: 'storage.providers.fields.github.custom-domain.description',
      helperKey: 'storage.providers.fields.github.custom-domain.helper',
    },
    {
      key: 'useRawUrl',
      labelKey: 'storage.providers.fields.github.use-raw.label',
      placeholderKey: 'storage.providers.fields.github.use-raw.placeholder',
      descriptionKey: 'storage.providers.fields.github.use-raw.description',
      helperKey: 'storage.providers.fields.github.use-raw.helper',
    },
  ],
  b2: [
    {
      key: 'applicationKeyId',
      labelKey: 'storage.providers.fields.b2.application-key-id.label',
      placeholderKey: 'storage.providers.fields.b2.application-key-id.placeholder',
      descriptionKey: 'storage.providers.fields.b2.application-key-id.description',
      required: true,
    },
    {
      key: 'applicationKey',
      labelKey: 'storage.providers.fields.b2.application-key.label',
      placeholderKey: 'storage.providers.fields.b2.application-key.placeholder',
      descriptionKey: 'storage.providers.fields.b2.application-key.description',
      sensitive: true,
      required: true,
    },
    {
      key: 'bucketId',
      labelKey: 'storage.providers.fields.b2.bucket-id.label',
      placeholderKey: 'storage.providers.fields.b2.bucket-id.placeholder',
      descriptionKey: 'storage.providers.fields.b2.bucket-id.description',
      required: true,
    },
    {
      key: 'bucketName',
      labelKey: 'storage.providers.fields.b2.bucket-name.label',
      placeholderKey: 'storage.providers.fields.b2.bucket-name.placeholder',
      descriptionKey: 'storage.providers.fields.b2.bucket-name.description',
      required: true,
    },
    {
      key: 'prefix',
      labelKey: 'storage.providers.fields.b2.prefix.label',
      placeholderKey: 'storage.providers.fields.b2.prefix.placeholder',
      descriptionKey: 'storage.providers.fields.b2.prefix.description',
    },
    {
      key: 'customDomain',
      labelKey: 'storage.providers.fields.b2.custom-domain.label',
      placeholderKey: 'storage.providers.fields.b2.custom-domain.placeholder',
      descriptionKey: 'storage.providers.fields.b2.custom-domain.description',
    },
    {
      key: 'excludeRegex',
      labelKey: 'storage.providers.fields.b2.exclude-regex.label',
      placeholderKey: 'storage.providers.fields.b2.exclude-regex.placeholder',
      descriptionKey: 'storage.providers.fields.b2.exclude-regex.description',
      helperKey: 'storage.providers.fields.b2.exclude-regex.helper',
      multiline: true,
    },
    // {
    //   key: 'maxFileLimit',
    //   labelKey: 'storage.providers.fields.b2.max-files.label',
    //   placeholderKey: 'storage.providers.fields.b2.max-files.placeholder',
    //   descriptionKey: 'storage.providers.fields.b2.max-files.description',
    // },
    {
      key: 'authorizationTtlMs',
      labelKey: 'storage.providers.fields.b2.authorization-ttl.label',
      placeholderKey: 'storage.providers.fields.b2.authorization-ttl.placeholder',
      descriptionKey: 'storage.providers.fields.b2.authorization-ttl.description',
    },
    {
      key: 'uploadUrlTtlMs',
      labelKey: 'storage.providers.fields.b2.upload-ttl.label',
      placeholderKey: 'storage.providers.fields.b2.upload-ttl.placeholder',
      descriptionKey: 'storage.providers.fields.b2.upload-ttl.description',
    },
  ],
}

export function createStorageProviderFormSchema(t: UiSchemaTFunction): StorageProviderFormSchema {
  const fieldsEntries = STORAGE_PROVIDER_TYPES.map((type) => {
    const configs = STORAGE_PROVIDER_FIELD_CONFIG[type]
    const resolvedFields = configs.map<StorageProviderFieldSchema>((field) => ({
      key: field.key,
      label: t(field.labelKey),
      description: field.descriptionKey ? t(field.descriptionKey) : undefined,
      placeholder: field.placeholderKey ? t(field.placeholderKey) : undefined,
      helperText: field.helperKey ? t(field.helperKey) : undefined,
      multiline: field.multiline ?? false,
      sensitive: field.sensitive ?? false,
      required: field.required ?? false,
    }))
    return [type, resolvedFields] as const
  })

  const providerTypes = STORAGE_PROVIDER_TYPES.map((value) => ({
    value,
    label: t(`storage.providers.types.${value}`),
  }))

  return {
    types: providerTypes,
    fields: Object.fromEntries(fieldsEntries) as unknown as Record<
      StorageProviderType,
      readonly StorageProviderFieldSchema[]
    >,
  }
}
