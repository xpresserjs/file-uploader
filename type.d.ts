declare namespace XpresserHttp {
    interface Engine {
        /**
         * Auth Initiator
         * @return {Promise<null|*>}
         */
        file(key: string, $opts?: {size?: number}): any
    }
}
