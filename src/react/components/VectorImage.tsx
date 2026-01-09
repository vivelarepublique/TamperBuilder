import React from 'react';

import vueLogo from '../../assets/svg/vue.svg';
import reactLogo from '../../assets/svg/react.svg';

import preactLogo from '../../assets/svg/preact.svg';
import litLogo from '../../assets/svg/lit.svg';
import svelteLogo from '../../assets/svg/svelte.svg';
import solidLogo from '../../assets/svg/solid.svg';

import lessLogo from '../../assets/svg/less.svg';
import sassLogo from '../../assets/svg/sass.svg';
import stylusLogo from '../../assets/svg/stylus.svg';

import nodejsLogo from '../../assets/svg/nodejs.svg';
import typescriptLogo from '../../assets/svg/typescript.svg';
import viteLogo from '../../assets/svg/vite.svg';

export default function VectorImage() {
    return (
        <React.Fragment>
            <div className='block framework-test-text-align'>
                <div className='subtitle is-2 header-framework-test-react'>React Test Vector Image</div>

                <div className='box'>
                    <div className='columns'>
                        <div className='column is-6'>
                            <div>
                                <img src={vueLogo} className='framework-test-logo' alt='Vue logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-vue' href='https://vuejs.org' target='_blank' rel='noopener'>
                                    Vue
                                </a>
                            </div>
                        </div>
                        <div className='column is-6'>
                            <div>
                                <img src={reactLogo} className='framework-test-logo framework-test-logo-animation' alt='React logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-react' href='https://react.dev' target='_blank' rel='noopener'>
                                    React
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='box'>
                    <div className='columns'>
                        <div className='column is-3'>
                            <div>
                                <img src={preactLogo} className='framework-test-logo' alt='Preact logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-preact' href='https://preactjs.com' target='_blank' rel='noopener'>
                                    Preact
                                </a>
                            </div>
                        </div>
                        <div className='column is-3'>
                            <div>
                                <img src={litLogo} className='framework-test-logo' alt='Lit logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-lit' href='https://lit.dev' target='_blank' rel='noopener'>
                                    Lit
                                </a>
                            </div>
                        </div>
                        <div className='column is-3'>
                            <div>
                                <img src={svelteLogo} className='framework-test-logo' alt='Svelte logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-svelte' href='https://svelte.dev' target='_blank' rel='noopener'>
                                    Svelte
                                </a>
                            </div>
                        </div>
                        <div className='column is-3'>
                            <div>
                                <img src={solidLogo} className='framework-test-logo' alt='Solid logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-solid' href='https://www.solidjs.com' target='_blank' rel='noopener'>
                                    Solid
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='box'>
                    <div className='columns'>
                        <div className='column is-4'>
                            <div>
                                <img src={lessLogo} className='framework-test-logo framework-test-less-logo' alt='Less logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-less' href='https://lesscss.org' target='_blank' rel='noopener'>
                                    Less
                                </a>
                            </div>
                        </div>
                        <div className='column is-4'>
                            <div>
                                <img src={sassLogo} className='framework-test-logo framework-test-sass-logo' alt='Sass logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-sass' href='https://sass-lang.com' target='_blank' rel='noopener'>
                                    Sass
                                </a>
                            </div>
                        </div>
                        <div className='column is-4'>
                            <div>
                                <img src={stylusLogo} className='framework-test-logo framework-test-stylus-logo' alt='Stylus logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-stylus' href='https://stylus-lang.com' target='_blank' rel='noopener'>
                                    Stylus
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='box'>
                    <div className='columns'>
                        <div className='column is-4'>
                            <div>
                                <img src={nodejsLogo} className='framework-test-logo' alt='Nodejs logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-nodejs' href='https://nodejs.org' target='_blank' rel='noopener'>
                                    Nodejs
                                </a>
                            </div>
                        </div>
                        <div className='column is-4'>
                            <div>
                                <img src={typescriptLogo} className='framework-test-logo' alt='Typescript logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-typescript' href='https://www.typescriptlang.org' target='_blank' rel='noopener'>
                                    Typescript
                                </a>
                            </div>
                        </div>
                        <div className='column is-4'>
                            <div>
                                <img src={viteLogo} className='framework-test-logo' alt='Vite logo' />
                            </div>
                            <div>
                                <a className='framework-test-a-vite' href='https://vitejs.dev' target='_blank' rel='noopener'>
                                    Vite
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}
